import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function CreatorDatingRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDatingRequests();
  }, []);

  async function fetchDatingRequests() {
    try {
      setLoading(true);
      setError(null);

      // Check logged-in user
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

      // Get ALL dating requests
      const { data: requestData, error: requestError } = await supabase
        .from('date_requests')
        .select(
          'id, requester_id, requested_id, created_at, status, created_date, accepted_at, expires_at'
        )
        .order('created_at', { ascending: false });

      if (requestError) throw requestError;

      if (!requestData || requestData.length === 0) {
        setRequests([]);
        return;
      }

      // Collect all user IDs
      const userIds = [
        ...new Set(
          requestData.flatMap((request) => [
            request.requester_id,
            request.requested_id,
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

      // Attach profiles to requests
      const formattedRequests = requestData.map((request) => ({
        ...request,
        requester: profileMap[request.requester_id] || null,
        requested: profileMap[request.requested_id] || null,
      }));

      setRequests(formattedRequests);
    } catch (err) {
      console.error('Error fetching dating requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRequest(requestId) {
    const confirmed = window.confirm(
      'Энэ болзооны хүсэлтийг бүр мөсөн устгах уу?\n\nЭнэ үйлдлийг буцаах боломжгүй.'
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
        alert('Зөвхөн Creator устгах боломжтой.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('date_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      setRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId)
      );

      alert('Dating request амжилттай устгагдлаа.');
    } catch (err) {
      console.error('Error deleting dating request:', err);
      alert(`Устгахад алдаа гарлаа: ${err.message}`);
    }
  }

  function formatDate(date) {
    if (!date) return 'Unknown';

    return new Date(date).toLocaleString();
  }

  if (loading) {
    return <p>Dating requests ачаалж байна...</p>;
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

      <h1>💌 All Dating Requests</h1>

      <p>
        Нийт dating request:{' '}
        <strong>{requests.length}</strong>
      </p>

      {requests.length === 0 ? (
        <p>Одоогоор dating request байхгүй байна.</p>
      ) : (
        <div>
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#fff',
              }}
            >
              <p>
                <strong>📤 From:</strong>{' '}
                {request.requester?.nickname ||
                  request.requester?.username ||
                  request.requester_id}
              </p>

              <p>
                <strong>📥 To:</strong>{' '}
                {request.requested?.nickname ||
                  request.requested?.username ||
                  request.requested_id}
              </p>

              <p>
                <strong>📌 Status:</strong>{' '}
                {request.status || 'Unknown'}
              </p>

              <p>
                <strong>📅 Created:</strong>{' '}
                {formatDate(request.created_at)}
              </p>

              {request.created_date && (
                <p>
                  <strong>🗓️ Created date:</strong>{' '}
                  {request.created_date}
                </p>
              )}

              {request.accepted_at && (
                <p>
                  <strong>❤️ Accepted:</strong>{' '}
                  {formatDate(request.accepted_at)}
                </p>
              )}

              {request.expires_at && (
                <p>
                  <strong>⏰ Expires:</strong>{' '}
                  {formatDate(request.expires_at)}
                </p>
              )}

              <p style={{ fontSize: '12px', color: '#777' }}>
                Request ID: {request.id}
              </p>

              <button
                onClick={() => handleDeleteRequest(request.id)}
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
                🗑️ Delete Request
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}