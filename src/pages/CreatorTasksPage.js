import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function CreatorTasksPage() {
  const [taskType, setTaskType] = useState('assigned');
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, [taskType]);

  async function checkCreator() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not logged in');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_creator')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    if (!profile?.is_creator) {
      throw new Error('Creator access required');
    }
  }

  async function fetchTasks() {
    try {
      setLoading(true);
      setError(null);

      await checkCreator();

      const table =
        taskType === 'assigned'
          ? 'assigned_tasks'
          : 'couple_task';

      let query = supabase
        .from(table)
        .select(
          taskType === 'assigned'
            ? 'id, assigner_id, assignee_id, task_text, assigned_at'
            : 'id, assignee_id, task_text, assigned_at'
        )
        .order('assigned_at', { ascending: false });

      const { data: taskData, error: taskError } = await query;

      if (taskError) throw taskError;

      setTasks(taskData || []);

      if (!taskData || taskData.length === 0) {
        setProfiles({});
        return;
      }

      // Get profile IDs
      const userIds = [
        ...new Set(
          taskData.flatMap((task) => {
            if (taskType === 'assigned') {
              return [
                task.assigner_id,
                task.assignee_id,
              ];
            }

            return [task.assignee_id];
          })
        ),
      ].filter(Boolean);

      if (userIds.length === 0) {
        setProfiles({});
        return;
      }

      // Get profiles
      const { data: profileData, error: profileError } =
        await supabase
          .from('profiles')
          .select('id, username, nickname')
          .in('id', userIds);

      if (profileError) throw profileError;

      const profileMap = {};

      (profileData || []).forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      setProfiles(profileMap);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditTask(task) {
    const newTaskText = window.prompt(
      'Task-ийг засварлана уу:',
      task.task_text
    );

    if (newTaskText === null) return;

    const trimmedText = newTaskText.trim();

    if (!trimmedText) {
      alert('Task хоосон байж болохгүй.');
      return;
    }

    try {
      await checkCreator();

      const table =
        taskType === 'assigned'
          ? 'assigned_tasks'
          : 'couple_task';

      const { data: updatedTask, error } = await supabase
        .from(table)
        .update({
          task_text: trimmedText,
        })
        .eq('id', task.id)
        .select(
          taskType === 'assigned'
            ? 'id, assigner_id, assignee_id, task_text, assigned_at'
            : 'id, assignee_id, task_text, assigned_at'
        )
        .single();

      if (error) throw error;

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === task.id
            ? updatedTask
            : currentTask
        )
      );

      alert('Task амжилттай засварлагдлаа.');
    } catch (err) {
      console.error('Error editing task:', err);
      alert(`Task засварлахад алдаа гарлаа: ${err.message}`);
    }
  }

  async function handleDeleteTask(taskId) {
    const confirmed = window.confirm(
      'Энэ task-ийг бүр мөсөн устгах уу?\n\n' +
        'Энэ үйлдлийг буцаах боломжгүй.'
    );

    if (!confirmed) return;

    try {
      await checkCreator();

      const table =
        taskType === 'assigned'
          ? 'assigned_tasks'
          : 'couple_task';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId)
      );

      alert('Task амжилттай устгагдлаа.');
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(`Task устгахад алдаа гарлаа: ${err.message}`);
    }
  }

  function getName(userId) {
    const profile = profiles[userId];

    return (
      profile?.nickname ||
      profile?.username ||
      userId ||
      'Unknown user'
    );
  }

  function formatDate(date) {
    if (!date) return 'Unknown';

    return new Date(date).toLocaleString();
  }

  if (loading) {
    return <p>Tasks ачаалж байна...</p>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <button
          onClick={() => navigate('/leaderboard')}
          style={{
            padding: '8px 12px',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          🔙 Leaderboard руу буцах
        </button>

        <p
          style={{
            color: 'red',
            marginTop: '20px',
          }}
        >
          ❌ {error}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '1000px',
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

      <h1>📋 Creator Tasks</h1>

      {/* Task Type Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setTaskType('assigned')}
          style={{
            padding: '10px 15px',
            borderRadius: '5px',
            border:
              taskType === 'assigned'
                ? '2px solid #007bff'
                : '1px solid #ccc',
            backgroundColor:
              taskType === 'assigned'
                ? '#eaf3ff'
                : 'white',
            cursor: 'pointer',
          }}
        >
          📋 Assigned Tasks
        </button>

        <button
          onClick={() => setTaskType('couple')}
          style={{
            padding: '10px 15px',
            borderRadius: '5px',
            border:
              taskType === 'couple'
                ? '2px solid #007bff'
                : '1px solid #ccc',
            backgroundColor:
              taskType === 'couple'
                ? '#eaf3ff'
                : 'white',
            cursor: 'pointer',
          }}
        >
          💕 Couple Tasks
        </button>
      </div>

      <p>
        Нийт task:{' '}
        <strong>{tasks.length}</strong>
      </p>

      {tasks.length === 0 ? (
        <p>
          Одоогоор{' '}
          {taskType === 'assigned'
            ? 'assigned task'
            : 'couple task'}{' '}
          байхгүй байна.
        </p>
      ) : (
        <div>
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                backgroundColor: '#fff',
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {taskType === 'assigned'
                  ? '📋 Assigned Task'
                  : '💕 Couple Task'}
              </h3>

              {/* Only Assigned Tasks have an assigner */}
              {taskType === 'assigned' && (
                <p>
                  <strong>📤 Assigner:</strong>{' '}
                  {getName(task.assigner_id)}
                </p>
              )}

              <p>
                <strong>📥 Assignee:</strong>{' '}
                {getName(task.assignee_id)}
              </p>

              <p>
                <strong>📝 Task:</strong>{' '}
                {task.task_text}
              </p>

              <p>
                <strong>📅 Assigned:</strong>{' '}
                {formatDate(task.assigned_at)}
              </p>

              <p
                style={{
                  fontSize: '12px',
                  color: '#777',
                }}
              >
                Task ID: {task.id}
              </p>

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '15px',
                }}
              >
                <button
                  onClick={() => handleEditTask(task)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Edit Task
                </button>

                <button
                  onClick={() =>
                    handleDeleteTask(task.id)
                  }
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Delete Task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}