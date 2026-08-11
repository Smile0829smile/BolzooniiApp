import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function CreatorReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      setLoading(true);
      setError(null);

      // Make sure the logged-in user is a Creator
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not logged in');
      }

      const { data: creatorProfile, error: creatorError } = await supabase
        .from('profiles')
        .select('is_creator')
        .eq('id', user.id)
        .single();

      if (creatorError) throw creatorError;

      if (!creatorProfile?.is_creator) {
        throw new Error('Creator access required');
      }

      // Get all reports
      const { data, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_id,
          reason,
          created_at,
          reporter:profiles!reports_reporter_id_fkey (
            username,
            nickname
          ),
          reported:profiles!reports_reported_id_fkey (
            username,
            nickname
          )
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  async function handleDeleteReport(reportId) {
    const confirmed = window.confirm(
      'Энэ report-ийг бүр мөсөн устгах уу?\n\nЭнэ үйлдлийг буцаах боломжгүй.'
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
  
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);
  
      if (error) throw error;
  
      // Remove it from the screen immediately
      setReports((currentReports) =>
        currentReports.filter((report) => report.id !== reportId)
      );
  
      alert('Report амжилттай устгагдлаа.');
    } catch (err) {
      console.error('Error deleting report:', err);
      alert(`Report устгахад алдаа гарлаа: ${err.message}`);
    }
  }

  if (loading) {
    return <p>Reports ачаалж байна...</p>;
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

      <h1>🚨 All Reports</h1>

      <p>
        Нийт report: <strong>{reports.length}</strong>
      </p>

      {reports.length === 0 ? (
        <p>Одоогоор report байхгүй байна.</p>
      ) : (
        <div>
          {reports.map((report) => (
            <div
              key={report.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#fff',
              }}
            >
              <p>
                <strong>👤 Reporter:</strong>{' '}
                {report.reporter?.nickname ||
                  report.reporter?.username ||
                  report.reporter_id}
              </p>

              <p>
                <strong>🚨 Reported:</strong>{' '}
                {report.reported?.nickname ||
                  report.reported?.username ||
                  report.reported_id}
              </p>

              <p>
                <strong>📝 Reason:</strong> {report.reason}
              </p>

              <p>
                <strong>🕐 Date:</strong>{' '}
                {report.created_at
                  ? new Date(report.created_at).toLocaleString()
                  : 'Unknown'}
              </p>
              <button
                onClick={() => handleDeleteReport(report.id)}
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
                🗑️ Delete Report
            </button>

              <p style={{ fontSize: '12px', color: '#777' }}>
                Report ID: {report.id}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}