// src/components/BannedUserDashboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface Task {
  id: string;
  content: string;
  is_completed: boolean;
  assigned_by_user_id: string;
}

export default function BannedUserDashboard({ userId }: { userId: string }) {
    const [tasks, setTasks] = useState([] as Task[]);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, content, is_completed, assigned_by_user_id')
        .eq('banned_user_id', userId);

      if (!error) setTasks(data || []);
    };

    fetchTasks();
  }, [userId]);

  return (
    <div className="p-4 bg-red-100 rounded-xl shadow">
      <h2 className="text-2xl font-bold text-red-700 mb-4">You are currently banned 😔</h2>
      <p className="mb-4">Complete the tasks below to lift your ban:</p>
      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
            <span>{task.content}</span>
            <span className={`text-sm font-medium ${task.is_completed ? 'text-green-600' : 'text-gray-500'}`}>
              {task.is_completed ? '✅ Done' : '⏳ Pending'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
