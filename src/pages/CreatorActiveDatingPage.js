import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function CreatorActiveDatingPage() {
  const [dating, setDating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDating();
  }, []);

  async function fetchDating() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not logged in');
      }

      // Check Creator permission
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('is_creator')
        .eq('id', user.id)
        .single();

      if (creatorError) throw creatorError;

      if (!creatorProfile?.is_creator) {
        throw new Error('Creator access required');
      }

      // Get ALL dating records
      const { data: datingData, error: datingError } = await supabase
        .from('dating')
        .select('id, user1_id, user2_id, started_at, ended_at')
        .order('started_at', { ascending: false });

      if (datingError) throw datingError;

      if (!datingData || datingData.length === 0) {
        setDating([]);
        return;
      }

      // Get all user IDs
      const userIds = [
        ...new Set(
          datingData.flatMap((relationship) => [
            relationship.user1_id,
            relationship.user2_id,
          ])
        ),
      ];

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, nickname, profile_pic')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = {};

      (profiles || []).forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      // Attach profiles to dating records
      const formattedDating = datingData.map((relationship) => ({
        ...relationship,
        user1: profileMap[relationship.user1_id] || null,
        user2: profileMap[relationship.user2_id] || null,
      }));

      setDating(formattedDating);
    } catch (err) {
      console.error('Error fetching dating:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDating(datingId) {
    const confirmed = window.confirm(
      'Энэ dating record-ийг бүр мөсөн устгах уу?\n\n' +
        'Энэ үйлдлийг буцаах боломжгүй.'
    );

    if (!confirmed) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not logged in');
      }

      // Check Creator permission again
      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('is_creator')
        .eq('id', user.id)
        .single();

      if (creatorError) throw creatorError;

      if (!creatorProfile?.is_creator) {
        alert('Зөвхөн Creator dating record устгах боломжтой.');
        return;
      }

      // Delete dating record
      const { error: deleteError } = await supabase
        .from('dating')
        .delete()
        .eq('id', datingId);

      if (deleteError) throw deleteError;

      // Remove from screen
      setDating((currentDating) =>
        currentDating.filter(
          (relationship) => relationship.id !== datingId
        )
      );

      alert('Dating record амжилттай устгагдлаа.');
    } catch (err) {
      console.error('Error deleting dating:', err);
      alert(`Dating устгахад алдаа гарлаа: ${err.message}`);
    }
  }

  function getDisplayName(profile, fallbackId) {
    return (
      profile?.nickname ||
      profile?.username ||
      fallbackId ||
      'Unknown user'
    );
  }

  function formatDate(date) {
    if (!date) return 'Unknown';

    return new Date(date).toLocaleString();
  }

  if (loading) {
    return <p>Dating history ачаалж байна...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <button onClick={() => navigate('/leaderboard')}>
          🔙 Leaderboard руу буцах
        </button>

        <p style={{ color: 'red', marginTop: '20px' }}>
          ❌ {error}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <button
        onClick={() => navigate('/leaderboard')}
        style={{
          marginBottom: '20px',
          padding: '8px 12px',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        🔙 Leaderboard руу буцах
      </button>

      <h1>❤️ Dating History</h1>

      <p>
        Нийт dating:{' '}
        <strong>{dating.length}</strong>
      </p>

      {dating.length === 0 ? (
        <p>Одоогоор dating record байхгүй байна.</p>
      ) : (
        <div>
          {dating.map((relationship) => (
            <div
              key={relationship.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                backgroundColor: '#fff',
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                💕{' '}
                {getDisplayName(
                  relationship.user1,
                  relationship.user1_id
                )}{' '}
                ❤️{' '}
                {getDisplayName(
                  relationship.user2,
                  relationship.user2_id
                )}
              </h3>

              <p>
                <strong>Status:</strong>{' '}
                {relationship.ended_at
                  ? '🔴 Ended'
                  : '🟢 Active'}
              </p>

              <p>
                <strong>🕐 Started:</strong>{' '}
                {formatDate(relationship.started_at)}
              </p>

              {relationship.ended_at && (
                <p>
                  <strong>🔴 Ended:</strong>{' '}
                  {formatDate(relationship.ended_at)}
                </p>
              )}

              <p
                style={{
                  fontSize: '12px',
                  color: '#777',
                }}
              >
                Dating ID: {relationship.id}
              </p>

              <button
                onClick={() =>
                  handleDeleteDating(relationship.id)
                }
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                🗑️ Delete Dating
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}