import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';

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

export default function ProfileViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [extraPhotos, setExtraPhotos] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!id) {
        setError(new Error('No user ID provided in URL'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error('Profile not found');
        setProfile(profileData);

        const { data: photoData, error: photoError } = await supabase
          .from('extra_photos')
          .select('*')
          .eq('user_id', id);

        if (photoError) {
          console.error('Error fetching extra photos:', photoError);
        } else {
          setExtraPhotos(photoData);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [id]);

  const handleImageClick = (url) => setExpandedImage(url);
  const closeImageModal = () => setExpandedImage(null);

  if (loading) return <p>Loading profile...</p>;
  if (error) return <p>Could not fetch profile: {error.message}</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {profile.is_admin && (
        <div
          style={{
            backgroundColor: '#e0f0ff',
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '5px',
            color: 'blue',
            fontWeight: 'bold',
            fontSize: '18px',
            textAlign: 'center',
          }}
        >
          👑 Admin Account
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '20px',
          padding: '8px 12px',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        🔙 Буцах
      </button>

      <h1>{profile.nickname}</h1>

      {profile.profile_pic && (
        <img
          src={profile.profile_pic}
          alt={`${profile.username}'s avatar`}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            cursor: 'pointer',
            objectFit: 'cover',
            marginBottom: '10px',
          }}
          onClick={() => handleImageClick(profile.profile_pic)}
        />
      )}

      <p>Username: {profile.username}</p>
      {!profile.is_admin && (
        <>
          <p>Christma оноо: {profile.christma_points}</p>
          <p>Likes: {profile.like_count}</p>
          <p>Болзоо: {profile.date_count}</p>
        </>
      )}
      <p>Email: {profile.email || 'Not provided'}</p>
      <p>Утас: {profile.phone_number || 'Not provided'}</p>
      <p>Хүйс: {profile.gender}</p>
      <p>Нас: {calculateAge(profile.birthdate)}</p>
      <p>Байршил: {profile.location || 'Байршил оруулаагүй'}</p>

      

      <h3 style={{ marginTop: '30px' }}>📸 Нэмэлт зураг</h3>
      {extraPhotos.length > 0 ? (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {extraPhotos.map((photo) => (
            <img
              key={photo.id}
              src={photo.photo_url}
              alt="Extra"
              onClick={() => handleImageClick(photo.photo_url)}
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'cover',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      ) : (
        <p>Энэ хэрэглэгч ямар ч зураг оруулаагүй байна.</p>
      )}

      {expandedImage && (
        <div
          onClick={closeImageModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 1000,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeImageModal();
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.8)',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              fontSize: '18px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            aria-label="Close image"
            title="Close"
          >
            ×
          </button>
          <img
            src={expandedImage}
            alt="Expanded"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)',
            }}
          />
        </div>
      )}
    </div>
  );
}
