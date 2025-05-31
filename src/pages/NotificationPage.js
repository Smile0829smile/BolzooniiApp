import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) fetchNotifications();
  }, [currentUserId]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setNotifications(data);
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <button onClick={() => navigate('/leaderboard')} style={{ marginBottom: '20px' }}>
        🔙 Leaderboard руу буцах
      </button>

      <h2>📢 Notifications</h2>

      {notifications.length === 0 ? (
        <p>notifications ирээгүй байна.</p>
      ) : (
        <ul style={{ padding: 0 }}>
          {notifications.map((note) => (
            <li key={note.id} style={{ listStyle: 'none', marginBottom: '10px' }}>
              <strong>{note.message}</strong> <br />
              <small>{formatDistanceToNow(new Date(note.created_at + 'Z'), { addSuffix: true })}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
