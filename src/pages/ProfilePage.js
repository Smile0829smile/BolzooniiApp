import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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
    gender: '',
    like_count: 0,
    date_count: 0,
    phone_number: '',
  });
  const [extraPhotos, setExtraPhotos] = useState([]);
  const [birthdateInput, setBirthdateInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkBanAndFetchProfile = async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('User not found:', userError);
        setLoading(false);
        return;
      }

      // Check if user is banned
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

      if (bannedData) {
        setIsBanned(true);
      }

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
          gender: data.gender || '',
          like_count: data.like_count || 0,
          date_count: data.date_count || 0,
          phone_number: data.phone_number || '',
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return alert('Not logged in');

    const updates = {
      id: user.id,
      nickname: profile.nickname,
      birthdate: profile.birthdate,
      profile_pic: profile.profile_pic,
      is_in_relationship: profile.is_in_relationship,
      is_on_break: profile.is_on_break,
      gender: profile.gender,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) alert('Error updating profile');
    else alert('Profile updated!');
    setLoading(false);
  };

  const uploadAvatar = async (event) => {
    if (isBanned) return alert('Banned users cannot change their profile picture.');
    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) return alert('Error uploading avatar');

    const { data: publicData } = await supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    setProfile((prev) => ({ ...prev, profile_pic: publicData.publicUrl }));
    setPreviewUrl(publicData.publicUrl);
  };

  const handleBirthdateSave = async () => {
    if (!birthdateInput) return alert('Select your birthdate');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ birthdate: birthdateInput })
      .eq('id', user.id);
    if (error) alert('Error saving birthdate');
    else {
      setProfile((prev) => ({ ...prev, birthdate: birthdateInput }));
      alert('Birthdate saved!');
    }
  };

  const uploadExtraPhoto = async (event) => {
    if (isBanned) return alert('Banned users cannot upload extra photos.');
    if (extraPhotos.length >= 3) return alert('You can only upload 3 photos.');
    const file = event.target.files[0];
    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `extra_photos/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) return alert('Upload failed');

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

    await supabase
      .from('profiles')
      .update({ christma_points: profile.christma_points + 10 })
      .eq('id', user.id);
    setProfile((prev) => ({
      ...prev,
      christma_points: prev.christma_points + 10,
    }));
  };

  const removePhoto = async (photoId, photoUrl) => {
    if (isBanned) return alert('Banned users cannot remove extra photos.');
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

  if (loading) return <p>Loading profile...</p>;

  return (
    <div style={{ maxWidth: '500px', margin: 'auto', padding: '20px' }}>
      <h2>My Profile</h2>
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
        <strong>Profile Picture</strong>
        <br/>
        {previewUrl && (
          <img src={previewUrl} alt="Avatar" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <br/>
        <input type="file" accept="image/*" onChange={uploadAvatar} disabled={isBanned} />
      </div>
      <br />
      <div>
        <strong>Nickname</strong>
        <br />
        <input
          type="text"
          value={profile.nickname}
          onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
          disabled={isBanned}
        />
      </div>
      <br />
      <div>
        <strong>Username:</strong> {profile.username + " (You cannot change your username)"}
      </div>
        <br></br>
      <div>
        <strong>Phone Number:</strong> {profile.phone_number || 'Not set'}
      </div>
        <br></br>
      <div>
        <strong>Хүйс:</strong> {profile.gender || 'Not set'}
      </div>
        <br></br>
      {profile.birthdate && (
        <div>
          <strong>Нас:</strong> {calculateAge(profile.birthdate)}
        </div>
      )}
        <br></br>
      <div><strong>Christma оноо:</strong> {profile.christma_points}</div>
        <br></br>
      <div><strong>Likes:</strong> {profile.like_count}</div>
        <br></br>
      <div><strong>Болзоо:</strong> {profile.date_count}</div>
      <br />

      <button onClick={updateProfile}>{loading ? 'Saving...' : 'Update Profile'} 🆕</button>
      <hr></hr>
      <button onClick={() => navigate('/leaderboard')}>🏆Leaderboard ийг харах</button>
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
            <img src={photo.photo_url} alt="Extra" style={{ width: 100, height: 100, objectFit: 'cover' }} />
            <br />
            <button onClick={() => removePhoto(photo.id, photo.photo_url)} disabled={isBanned}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
