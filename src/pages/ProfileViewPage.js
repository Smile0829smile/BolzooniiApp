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

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        if (!profileData) throw new Error('Profile not found');

        setProfile(profileData);

        // Fetch extra photos
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

  if (loading) return <p>Loading profile...</p>;
  if (error) return <p>Could not fetch profile: {error.message}</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* Go Back Button */}
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

      <h1>{profile.username}</h1>
      {profile.profile_pic && (
        <img
          src={profile.profile_pic}
          alt={`${profile.username}'s avatar`}
          style={{ width: '150px', height: '150px', borderRadius: '50%' }}
        />
      )}
      <p>Nickname: {profile.nickname || profile.username}</p>
      <p>Christma оноо: {profile.christma_points}</p>
      <p>Email: {profile.email || 'Not provided'}</p>
      <p>Хүйс: {profile.gender}</p>
      <p>Нас: {calculateAge(profile.birthdate)}</p>
      <p>Likes: {profile.like_count}</p>
      <p>Болзоо: {profile.date_count}</p>

      {/* Extra Photos Section */}
      <h3 style={{ marginTop: '30px' }}>📸 Нэмэлт зураг</h3>
      {extraPhotos.length > 0 ? (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {extraPhotos.map((photo) => (
            <img
              key={photo.id}
              src={photo.photo_url}
              alt="Extra"
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
          ))}
        </div>
      ) : (
        <p>Энэ хэрэглэгч ямар ч зураг оруулаагүй байна.</p>
      )}
    </div>
  );
}
