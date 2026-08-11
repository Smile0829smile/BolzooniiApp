import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import React from 'react';

function calculateAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    nickname: '',
    birthdate: '',
    profile_pic: '',
    christma_points: 0,
    date_point: 0,
    gender: '',
    like_count: 0,
    date_count: 0,
    phone_number: '',
    location: '',
    is_admin: false,
  });
  const [extraPhotos, setExtraPhotos] = useState([]);
  const [birthdateInput, setBirthdateInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState('');


  useEffect(() => {
    const checkBanAndFetchProfile = async () => {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User not found:', userError);
        setLoading(false);
        return;
      }

      const { data: bannedData, error: banError } = await supabase
        .from('bans')
        .select('banned_user_id')
        .eq('banned_user_id', user.id)
        .single();

      if (banError && banError.code !== 'PGRST116') {
        console.error('Error checking ban status:', banError);
        setLoading(false);
        return;
      }

      if (bannedData) setIsBanned(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile({
          username: data.username || '',
          nickname: data.nickname || '',
          birthdate: data.birthdate || '',
          profile_pic: data.profile_pic || '',
          christma_points: data.christma_points || 0,
          date_points: data.date_points || 0,
          gender: data.gender || '',
          like_count: data.like_count || 0,
          date_count: data.date_count || 0,
          phone_number: data.phone_number || '',
          location: data.location || '',
          is_admin: data.is_admin || false,
        });
        setPreviewUrl(data.profile_pic || '');
        setBirthdateInput(data.birthdate || '');

        const { data: photos, error: photoError } = await supabase
          .from('extra_photos')
          .select('*')
          .eq('user_id', user.id);

        if (!photoError) setExtraPhotos(photos);
      }

      setLoading(false);
    };

    checkBanAndFetchProfile();
  }, [navigate]);

  const updateProfile = async () => {
    if (!profile.nickname || profile.nickname.trim() === '') {
      alert('Нэрээ заавал оруулна уу!');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Not logged in');

    const updates = {
      id: user.id,
      nickname: profile.nickname,
      profile_pic: profile.profile_pic,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) alert('Error updating profile');
    else alert('Profile updated!');
    setLoading(false);
  };

  const uploadAvatar = async (event) => {
    if (isBanned) {
      return alert(
        'Бандуулсан хэрэглэгч зурагаа сольж болохгүй.'
      );
    }
  
    const file = event.target.files[0];
  
    if (!file) return;
  
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
      return alert('Not logged in');
    }
  
    const fileExt =
      file.name.split('.').pop();
  
    const fileName =
      `${Date.now()}.${fileExt}`;
  
    // NEW STRUCTURE
    const filePath =
      `avatars/${user.id}/${fileName}`;
  
    const { error: uploadError } =
      await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
  
    if (uploadError) {
      console.error(uploadError);
  
      return alert(
        'Error uploading avatar'
      );
    }
  
    const { data: publicData } =
      supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
  
    const newUrl =
      publicData.publicUrl;
  
    // Update DB immediately
    const { error: updateError } =
      await supabase
        .from('profiles')
        .update({
          profile_pic: newUrl,
          updated_at: new Date(),
        })
        .eq('id', user.id);
  
    if (updateError) {
      console.error(updateError);
  
      await supabase.storage
        .from('avatars')
        .remove([filePath]);
  
      return alert(
        'Profile зураг хадгалахад алдаа гарлаа.'
      );
    }
  
    setProfile((prev) => ({
      ...prev,
      profile_pic: newUrl,
    }));
  
    setPreviewUrl(newUrl);
  
    alert(
      'Profile зураг амжилттай шинэчлэгдлээ.'
    );
  };

  const uploadExtraPhoto = async (event) => {
    if (isBanned) return alert('Бандуулсан хэрэглэгч зураг оруулж болохгүй.');
    if (extraPhotos.length >= 3) return alert('Та ихдээ 3 зураг оруулах боломжтой.');
    if (profile.is_admin) {
      alert('Admin хэрэглэгчид зураг оруулснаар оноо авахгүй.');
    }
  
    const file = event.target.files[0];
    if (!file) return;
  
    const { data: { user } } = await supabase.auth.getUser();
  
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `extra_photos/${user.id}/${fileName}`;
  
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);
  
    if (uploadError) return alert('Зураг оруулах үед алдаа гарлаа.');
  
    const { data: publicData } = await supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
  
    const { error: insertError, data: newPhoto } = await supabase
      .from('extra_photos')
      .insert([{ user_id: user.id, photo_url: publicData.publicUrl }])
      .select()
      .single();
  
    if (insertError) return alert('Insert photo failed');
  
    setExtraPhotos([...extraPhotos, newPhoto]);
  
    // ✅ ONLY give points if NOT admin
    if (!profile.is_admin) {
      await supabase
        .from('profiles')
        .update({ christma_points: profile.christma_points + 10 })
        .eq('id', user.id);
  
      setProfile((prev) => ({
        ...prev,
        christma_points: prev.christma_points + 10,
      }));
    }
  };
  

  const removePhoto = async (photoId, photoUrl) => {
    if (isBanned) return alert('Бандуулсан хэрэглэгч зураг нэмж оруулж болохгүй.');
    const { data: { user } } = await supabase.auth.getUser();

    const filePath = decodeURIComponent(new URL(photoUrl).pathname.split('/').slice(2).join('/'));

    await supabase.storage.from('avatars').remove([filePath]);

    const { error } = await supabase
      .from('extra_photos')
      .delete()
      .eq('id', photoId);

    if (!error) {
      setExtraPhotos(extraPhotos.filter((p) => p.id !== photoId));
      await supabase
        .from('profiles')
        .update({ christma_points: profile.christma_points - 10 })
        .eq('id', user.id);
      setProfile((prev) => ({
        ...prev,
        christma_points: prev.christma_points - 10,
      }));
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported.');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || '';
          const state = data.address.state || '';
          const country = data.address.country || '';
          const detectedLocation = [city, state, country].filter(Boolean).join(', ');
  
          // Save to Supabase
          const { data: { user } } = await supabase.auth.getUser();
          const { error } = await supabase
            .from('profiles')
            .update({ location: detectedLocation })
            .eq('id', user.id);
  
          if (error) return alert(error.message);
  
          setProfile((prev) => ({ ...prev, location: detectedLocation }));
          alert('Location updated!');
        } catch (err) {
          alert('Failed to detect location.');
        }
      },
      () => alert('Location permission denied.')
    );
  };  
  

  if (loading) return <p>Loading profile...</p>;

  return (
    <div style={{ maxWidth: '500px', margin: 'auto', padding: '20px' }}>
      <h1>My Profile</h1>

      {isBanned && (
        <div style={{
          backgroundColor: '#ffe0e0',
          color: '#b00000',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          🚫 Та Бандуулсан байгаа тул энэ хэсэгт юу ч өөрчлөж чадахгүй. Юм өөрчлөхийн тулд бан гаас гарна уу!
        </div>
      )}

      <div>
        <strong>Profile Зураг</strong>
        <br />
        {previewUrl && (
          <img
          src={previewUrl || 'https://supabase.com/dashboard/project/uhzxbeusepqzwysxboqk/storage/buckets/avatars/profible_picture.jpg'}
          alt="Avatar"
          style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
          onClick={() => setSelectedImage(previewUrl)}
        />        
        )}
        <br />
        <input type="file" accept="image/*" onChange={uploadAvatar} disabled={isBanned} />
      </div>

      <br />
      <div>
        <strong>Nickname: </strong>
        <input
          type="text"
          value={profile.nickname}
          onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
          disabled={isBanned}
        />
      </div>
      <br />
      <button onClick={updateProfile}>{loading ? 'Хадгалж байна...' : 'Хадгалах'} 🆕</button>
      <br />
      <hr />
      <br />
      <div>
        <strong>Username:</strong> {profile.username + " (Та энэ нэрийг сольж болохгүй)"}
      </div>
      <br />
      <div>
        <strong>Утасны дугаар:</strong> {profile.phone_number || 'Not set'}
      </div>
      <br />
      <div>
        <strong>Байршил:</strong>{' '}
        {profile.location || 'Not set'}{' '}
        <button onClick={detectLocation}>📍 Detect</button>
      </div>
      <br />
      <div>
        <strong>Хүйс:</strong> {profile.gender || 'Not set'}
      </div>
      <br />
      {profile.birthdate && (
        <div>
          <strong>Нас:</strong> {calculateAge(profile.birthdate)}
        </div>
      )}
      <br />
      
      {!profile.is_admin && (
        <>
          <div><strong>Christma оноо:</strong> {profile.christma_points}</div>
          <br />
          <div><strong>💕 Болзооны оноо:</strong> {profile.date_points || 0}</div>
          <br />
          <div><strong>Likes:</strong> {profile.like_count}</div>
          <br />
          <div><strong>Болзоо:</strong> {profile.date_count}</div>
          <br />
        </>
      )}
      <hr />
      <button
        onClick={() => navigate('/rules-agreement')}
      >
        📜 Хэрэглэгчийн гэрээ
      </button>
      <br/><br/>
      <button
        onClick={async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            navigate(
              `/date-history/${user.id}`
            );
          }
        }}
        style={{
          marginRight: '8px',
        }}
      >
        💕 Миний болзооны түүх
      </button>
      <br/><br/>
      <button onClick={() => navigate('/leaderboard')}>🏆 Leaderboard ийг харах</button>
      <br /><br />
      <button onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
      }}>🚪 Гарах</button>

      <hr />
      <h3>Миний зурагнууд (Дээд хэмжээ 3)</h3>
      <p>Нэг өөрийнхөө зургийг оруулах нь таньд 10 christma оноо өгнө.</p>
      <input type="file" accept="image/*" onChange={uploadExtraPhoto} disabled={isBanned} />
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
        {extraPhotos.map((photo) => (
          <div key={photo.id}>
            <img
              src={photo.photo_url}
              alt="Extra"
              style={{ width: 100, height: 100, objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => setSelectedImage(photo.photo_url)}
            />
            <br />
            <button onClick={() => removePhoto(photo.id, photo.photo_url)} disabled={isBanned}>Устгах</button>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <img
            src={selectedImage}
            alt="Zoomed"
            style={{
              maxHeight: '90%',
              maxWidth: '90%',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(255,255,255,0.3)'
            }}
          />
          <button
            style={{
              position: 'absolute',
              top: 20,
              right: 30,
              fontSize: 30,
              color: 'white',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: '12px', right: '16px', fontSize: '12px', color: '#999', opacity: 0.8,}}>Updated: August 11, 2026:Part3</div>
    </div>
  );
}
