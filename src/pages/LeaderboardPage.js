//The assign tasks are around 110th row!!!!
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import React from 'react';


function DateRequestCard({ request, onAccept, onReject }) {
  const { id, requester, status } = request;

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {requester?.profile_pic && (
          <img
            src={requester.profile_pic}
            alt={`${requester.username}'s avatar`}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              marginRight: '10px',
              objectFit: 'cover',
            }}
          />
        )}
        <span>
          <strong>{requester?.username || 'Unknown'}</strong> тань руу болзооны санал явуулсан байна!{' '}
          {status === 'pending' ? '' : `(${status})`}
        </span>
      </div>
      {status === 'pending' && (
        <div>
          <button onClick={() => onAccept(id, requester?.username)} style={{ marginRight: '5px' }}>
            ✅ Зөвшөөрөх
          </button>
          <button onClick={() => onReject(id)}>❌ Татгалзах</button>
        </div>
      )}
    </li>
  );
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [top3UserIds, setTop3UserIds] = useState([]);
  const [incomingDateRequests, setIncomingDateRequests] = useState([]);
  const [activeDate, setActiveDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [bannedUserIds, setBannedUserIds] = useState(new Set());
  const [myTask, setMyTask] = useState('');
  const [datingTask, setDatingTask] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);
  const [reportReasons, setReportReasons] = useState({});
  const [askedUserIds, setAskedUserIds] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);


  // after fetchCurrentUser, also fetch bans:
  useEffect(() => {
    if (currentUser?.id) {
      fetchBans();
    }
  }, [currentUser]);

  // existing ban handler
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchLeaderboard();
      fetchIncomingDateRequests();
      fetchActiveDate();
      fetchBans();  // also fetch bans here
    }
  }, [currentUser]);

  async function assignRandomTaskToCouple(coupleId) {
    const coupleRes = await supabase
      .from('dating')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single();
  
    if (coupleRes.error) {
      console.error('Error fetching couple:', coupleRes.error);
      return;
    }
  
    const { user1_id, user2_id } = coupleRes.data;
  
    // Fetch usernames of both users
    const profileRes = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', [user1_id, user2_id]);
  
    if (profileRes.error) {
      console.error('Error fetching usernames:', profileRes.error);
      return;
    }
  
    const usernames = profileRes.data.map(profile => profile.username);
  
    // Tasks
    const tasks = [
      "Тасралтгүй 2 цаг video call. Ярих хугацаандаа зураг зурах. Тэгээд хамгийн гуигтай юм уу хамгийн хөгжилтэй уншсан уран зохиолуудаа ярих.",
      "Эрэгтэй нь эмэгтэйгээ гэрээс очиж аваад зайсан толгой гараад хот би тэрэнд хайртай гээд орилох, орилж байгаагаа бичлэг болгоод грүпп дээр шэйр.",
      "Хамтдаа кино үзчихээд юм авж идэнгээ хотын гудамжаар алхах.",
      "Гэрээсээ хоол бэлдэж ирээд хамт уул руу гарж идэнгээ нэгэнийхээ зургийг дарж өгөх. (гоё хосийн зурагтай болох)",
      "Өөрсдөө болзоогоо төлөвлөөд Youtube дээр влог болгож оруулах. Тэгээд грүпп дээр линкээ өг.",
      "Хамт кино ямар ч хамаагүй байдлаар үзээд. Киноны хамгийн гоё хэсэг юу байсныг яриад тэр киногоо үнэлэх. Зураг эдр дарвал грүпп дээр шэйр",
      "Нэгэндээ тоглодог 2 online, 1 offline тоглоомоо хуваалц. Тэгээд нэгийн сонгоод нэгнийхээ рекордыг эвд эсвэл нэгэнтэйгээ хамт тогло.",
      "Дуртай 3 дуугаа нэгэнтэйгээ хуваалцаад, Нэг дуугаа сонгоод хамт дуулаад, тэрийгээ грүпп дээр шэйр.",
      "30 минутын болзооны сорил. 5 минутанд өдөр тутамд юу хийдгээ, 10 минутанд хамгийн их мөрөөддөг зүйлээ, 15 минутанд чөлөөт цагаа хэрхэн өнгөрөөдөгөө.",
      "Нэгэнтэйгээ 1 цаг ярингаа нэгэнийхээ хувцуудыг хараад ямар хувцас өмсөхийн заах. Тэгээд зурагаа даруулаад грүпп дээр шэйр."
    ];
  
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
  
    // Insert tasks for both users
    const { error } = await supabase.rpc('assign_couple_task', {
      u1: user1_id,
      u2: user2_id,
      task: randomTask,
    });
    
    if (error) {
      console.error('Error assigning couple task:', error);
    }
    
  
    // Add public notification
    const message = `Шинэ хосийн даалгавар ${usernames[0]}, ${usernames[1]} хоёрт оногдлоо! 💑 Даалгавар: "${randomTask}"`;
  
    const notifRes = await supabase.from('notifications').insert({
      user_id: null,
      message,
    });
  
    if (notifRes.error) {
      console.error('Error creating notification:', notifRes.error);
    } else {
      console.log(message);
    }
  }  
  
  
  const assignTask = async (assigneeId, taskText) => {
    const { error } = await supabase.from('assigned_tasks').insert({
      assigner_id: currentUser.id,
      assignee_id: assigneeId,
      task_text: taskText,
    });

    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', assigneeId)
      .single();
  
    if (error) {
      console.error('Error assigning task:', error);
      alert('Даалгавар өгөлт амжилтгүй.');
    } else {
      // Also send a public notification
      await supabase.from('notifications').insert({
        user_id: null,
        message: `${data.username}-д даалгавар ирлээ. Даалгавар нь "${taskText}". 🧠`,
      });
  
      alert('Даалгавар амжилттай өгөгдлөө!');
    }
  };
  
  const handleSubmitReport = async (reportedId) => {
    const reason = reportReasons[reportedId] || '';
    if (!reason.trim()) return;
  
    const { error } = await supabase.from('reports').insert({
      reporter_id: currentUser.id,
      reported_id: reportedId,
      reason: reason.trim(),
    });
  
    if (error) {
      console.error('Supabase insert error:', error);
      alert('Failed to report');
    }
    else {
      alert('Reported successfully');
      setActiveReportId(null);
      setReportReasons(prev => ({ ...prev, [reportedId]: '' }));
    }
    console.log('Current user:', currentUser);
  };
  
  

  useEffect(() => {
    async function fetchMyTask() {
      const { data, error } = await supabase
        .from('assigned_tasks')
        .select('task_text')
        .eq('assignee_id', currentUser.id)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();
  
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching task:', error);
      } else if (data) {
        setMyTask(data.task_text);
      }
    }
  
    if (currentUser?.id) {
      fetchMyTask();
    }
  }, [currentUser?.id]);
  
  
  

  async function fetchTop3UserIds() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .order('christma_points', { ascending: false })
      .limit(3);

    if (!error && data) {
      setTop3UserIds(data.map(user => user.id));
      return data.map(user => user.id);
    } else {
      console.error('Failed to fetch top 3 users', error);
      return [];
    }
  }

  useEffect(() => {
    fetchTop3UserIds();
  }, []);

  async function fetchBans() {
    const top3Ids = await fetchTop3UserIds();
  
    let query = supabase
      .from('bans')
      .select('banned_user_id');
  
    // Top3 → only see their own bans
    if (!currentUser.is_admin) {
      query = query.eq('banned_by_id', currentUser.id);
    }
  
    const { data: bans, error } = await query;
  
    if (error) {
      console.error('Error fetching bans:', error);
      return;
    }
  
    const filteredBans = bans.filter(
      b => !top3Ids.includes(b.banned_user_id)
    );
  
    setBannedUserIds(new Set(filteredBans.map(b => b.banned_user_id)));
  }


  // ✅ Corrected ban handler with proper notification
  async function handleBanUser(bannedUserId) {
    // Fetch top 3 user IDs
    const top3Ids = await fetchTop3UserIds();

    // Check if currentUser is in top 3
    const isCurrentUserTop3 = top3Ids.includes(currentUser.id);

    if (isCurrentUserTop3) {
      // Check if ANY of the top 3 users have already banned someone
      const { data: existingBans, error } = await supabase
        .from('bans')
        .select('*')
        .in('banned_by_id', top3Ids);

      if (error) {
        console.error('Error checking existing bans:', error);
        return;
      }

      if (existingBans.length >= 1) {
        alert('Эхний гурав дундаа ганц л хүнийг бандах боломжтой. Энэ хэрэглэгчийг бандахын тулд эхлээд бандуулсан байгаа хэрэглэгчийг бангаас нь гаргана уу.');
        return;
      }
    }

    // Check if banned user is currently dating
    const dating = await isUserDating(bannedUserId);
    if (dating) {
      alert('Та болзож байгаа хэрэглэгчийг бандаж болохгүй.');
      return;
    }

    // Fetch banned user's username for notification
    const { data: bannedUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', bannedUserId)
      .single();

    if (profileError) {
      console.error('Error fetching banned user profile:', profileError);
      alert('Failed to fetch banned user info.');
      return;
    }

    // Proceed to ban user
    const { error: insertError } = await supabase
      .from('bans')
      .insert([{ banned_user_id: bannedUserId, banned_by_id: currentUser.id }]);

    if (insertError) {
      console.error('Error banning user:', insertError);
      alert('Failed to ban user.');
      return;
    }

    // Insert notification AFTER successful ban
    await supabase.from('notifications').insert({
      user_id: null,
      message: `Эхний гурав ${bannedUserProfile.username} ийг бандлаа! 🚫`,
    });

    alert('Та энэ хүнийг амжилттай бан длаа.');

    await fetchBans();       // refresh banned list
    fetchLeaderboard();      // refresh leaderboard if needed
  }

  

  // ✅ Corrected unban handler
  async function handleUnbanUser(unbanUserId) {
    let query = supabase
      .from('bans')
      .delete()
      .eq('banned_user_id', unbanUserId);
  
    // Top3 users can only remove THEIR OWN bans
    if (!currentUser.is_admin) {
      query = query.eq('banned_by_id', currentUser.id);
    }
  
    const { error } = await query;
  
    if (error) {
      console.error('Error unbanning user:', error);
      alert('Unban амжилтгүй боллоо.');
      return;
    }
  
    // Fetch username for notification
    const { data: unbannedProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', unbanUserId)
      .single();
  
    await supabase.from('notifications').insert({
      user_id: null,
      message: `${currentUser.username} нь ${unbannedProfile.username} ийг бангаас гаргалаа! ✅`,
    });
  
    await fetchBans();
    fetchLeaderboard();
  }
  


  async function isUserDating(userId) {
    const { data, error } = await supabase
      .from('date_requests')
      .select('id')
      .or(`and(requester_id.eq.${userId},status.eq.accepted),and(requested_id.eq.${userId},status.eq.accepted)`)
      .limit(1)
      .maybeSingle();
  
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking dating status:', error);
      return false;
    }
  
    return !!data;
  }  
  


  async function fetchCurrentUser() {
    try {
      setLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, is_admin')
        .eq('id', user.id)
        .single();

      setCurrentUser(profile);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeaderboard() {
    try {
      setLoading(true);
      const { data: normalUsers } = await supabase
        .from('profiles')
        .select('id, username, nickname, profile_pic, christma_points, gender, is_admin')
        .eq('is_admin', false)
        .order('christma_points', { ascending: false });

      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('id, username, nickname, profile_pic, christma_points, gender, is_admin')
        .eq('is_admin', true);

      setUsers(normalUsers);
      setAdminUsers(adminUsers);
      setTop3UserIds(normalUsers.slice(0, 3).map((u) => u.id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchIncomingDateRequests() {
    if (!currentUser?.id) return;
    try {
      const { data: requests } = await supabase
        .from('date_requests')
        .select('id, requester_id, status, created_at, expires_at')
        .eq('requested_id', currentUser.id)
        .order('created_at', { ascending: false });

        if (!requests) {
          setIncomingDateRequests([]);
          return;
        }

        const now = new Date().toISOString();

        for (const request of requests || []) {
          if (
            request.status === 'pending' &&
            request.expires_at &&
            request.expires_at < now
          ) {
            await supabase
              .from('date_requests')
              .update({ status: 'expired' })
              .eq('id', request.id);
        
            request.status = 'expired';
          }
        }

        const requesterIds = requests
        .filter((r) => r.status === 'pending')
        .map((r) => r.requester_id);
      const { data: requestersProfiles } = await supabase
        .from('profiles')
        .select('id, username, profile_pic')
        .in('id', requesterIds);

        const combined = requests
        .filter((r) => r.status === 'pending')
        .map((r) => ({
          ...r,
          requester: requestersProfiles.find((p) => p.id === r.requester_id),
        }));
      
      setIncomingDateRequests(combined);
    } catch (err) {
      console.error('Error fetching date requests:', err);
    }
  }

  async function fetchActiveDate() {
    if (!currentUser?.id) {
      setActiveDate(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('date_requests')
        .select('*')
        .or(
          `and(requester_id.eq.${currentUser.id},status.eq.accepted),and(requested_id.eq.${currentUser.id},status.eq.accepted)`
        )
        .maybeSingle(); // changed from .single() to .maybeSingle()
  
      if (error) {
        console.error('Error fetching active date:', error);
        setActiveDate(null);
        return;
      }
  
      setActiveDate(data || null);
    } catch (err) {
      console.error('Error fetching active date:', err);
      setActiveDate(null);
    }
  }



  // Assume you have currentUser and activeDate available
  useEffect(() => {
    if (!currentUser?.id || !activeDate?.id) {
      setDatingTask(null);
      return;
    }
  
    async function getPartnerId() {
      // Fix .or() syntax: wrap conditions in parentheses
      const { data, error } = await supabase
      .from('dating')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .single();
  
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching dating partner:', error);
        return null;
      }
      if (!data) {
        console.log('No dating row found');
        return null;
      }
  
      const partnerId = data.user1_id === currentUser.id ? data.user2_id : data.user1_id;
      console.log('PartnerId found:', partnerId);
      return partnerId;
    }
  
    async function fetchDatingTask() {
      const partnerId = await getPartnerId();
      if (!partnerId) {
        setDatingTask(null);
        return;
      }
  
      const { data, error } = await supabase
        .from('couple_task')
        .select('*')
        .in('assignee_id', [currentUser.id, partnerId])
        .order('assigned_at', { ascending: false })
        .limit(1)               // Add limit(1) for safety
        .single();
  
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching dating task:', error);
        setDatingTask(null);
      } else if (data) {
        console.log('Dating task found:', data);
        setDatingTask(data.task_text);
      } else {
        setDatingTask(null);
      }
    }
  
    fetchDatingTask();
  }, [currentUser?.id, activeDate?.id]);
  
  

  

  async function onLike(likedUserId) {
    if (!currentUser || currentUser.id === likedUserId) return;
  
    try {
      // Step 1: Ban check
      const { data: bannedUsers, error: bannedUsersError } = await supabase
        .from('bans')
        .select('banned_user_id')
        .in('banned_user_id', [currentUser.id, likedUserId]);
  
      if (bannedUsersError) throw bannedUsersError;
  
      if (bannedUsers && bannedUsers.length > 0) {
        if (bannedUsers.some(b => b.banned_user_id === currentUser.id)) {
          alert('Та бандуулсан байгаа тул like явуулах боломжгүй.');
        } else {
          alert('Энэ хэрэглэгч бандуулсан байгаа тул та like явуулж болохгүй.');
        }
        return;
      }
  
      // Step 2: Check if liked today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
      const { data: existingLikes, error: likeCheckError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', currentUser.id)
        .eq('liked_id', likedUserId)
        .eq('like_day', today);
  
      if (likeCheckError) throw likeCheckError;
  
      if (existingLikes.length > 0) {
        alert('Та энэ хүн рүү аль хэдийн like явуулсан байна! Маргааш дахин оролдоно уу.');
        return;
      }
  
      // Step 3: Get liked user's profile
      const { data: likedUser, error: userError } = await supabase
        .from('profiles')
        .select('username, christma_points, like_count')
        .eq('id', likedUserId)
        .single();
  
      if (userError) throw userError;
  
      // Step 4: Insert new like
      const now = new Date();
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          liker_id: currentUser.id,
          liked_id: likedUserId,
          created_at: now.toISOString(),
          like_day: today,
        });
  
      if (insertError) throw insertError;
  
      // Step 5: Update liked user's Christma points and like_count
      const updatedPoints = likedUser.christma_points + 2;
      const updatedLikeCount = likedUser.like_count + 1;
  
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          christma_points: updatedPoints,
          like_count: updatedLikeCount,
        })
        .eq('id', likedUserId);
  
      if (updateError) throw updateError;
  
      // Step 6: Create public notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: null,
        message: `${currentUser.username} нь ${likedUser.username} рүү like явууллаа! ❤️`,
      });
  
      if (notifError) throw notifError;
  
      alert('Та энэ хүн рүү like явууллаа! Энэ хүн +2 Christma оноо авлаа.');
      fetchLeaderboard();
  
    } catch (err) {
      console.error('Error liking user:', err);
      alert('Like явуулахад асуудал гарсан байна. Дахин оролдоно уу.');
    }
  }
    

  async function onAskDate(requestedId) {
    if (!currentUser || currentUser.id === requestedId) return;
  
    if (activeDate) {
      alert('Та өөр хүнтэй болзож байгаа тул тэр болзоогоо дуусгачихаад шинийг эхлүүлнэ үү.');
      return;
    }
  
    try {
      // 🚫 Ban check
      const { data: bannedUsers, error: bannedUsersError } = await supabase
        .from('bans')
        .select('banned_user_id')
        .in('banned_user_id', [currentUser.id, requestedId]);
  
      if (bannedUsersError) throw bannedUsersError;
  
      if (bannedUsers && bannedUsers.length > 0) {
        if (bannedUsers.some(b => b.banned_user_id === currentUser.id)) {
          alert('Та бан дуулсан байгаа тул болзооны санал явуулах хориотой.');
        } else {
          alert('Таны болзмоор байгаа хүн бан дуулсан байгаа тул банг аас гарахын хүлээнэ үү.');
        }
        return;
      }
  
      // 💌 Limit to one request per day
      const { data: todayRequestsCount, error: todayError } = await supabase
        .rpc('requests_sent_today', { user_id: currentUser.id });
  
      if (todayError) throw todayError;
  
      if (todayRequestsCount > 0) {
        alert('Та өдөрт ганц л болзооны санал явуулах эрхтэй.');
        return;
      }
  
      // 🧑‍🤝‍🧑 Get both profiles
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('christma_points, gender, username')
        .eq('id', currentUser.id)
        .single();
  
      if (currentProfileError) throw currentProfileError;
  
      const { data: requestedProfile, error: requestedProfileError } = await supabase
        .from('profiles')
        .select('username, christma_points, gender')
        .eq('id', requestedId)
        .single();
  
      if (requestedProfileError) throw requestedProfileError;
  
      // ❌ Gender rule
      if (currentProfile.gender === requestedProfile.gender) {
        alert('Зөвхөн эсрэг хүйстэн рүүгээ болзооны санал явуулна уу.');
        return;
      }
  
      // ❌ Christma points rule
      if (currentProfile.christma_points < requestedProfile.christma_points) {
        alert('Та зөвхөн өөрөөсөө БАГА оноотой хүн рүү болзооны санал явуулах эрхтэй');
        return;
      }
  
      // ✅ No duplicate request
      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('date_requests')
        .select('*')
        .or(
          `and(requester_id.eq.${currentUser.id},requested_id.eq.${requestedId}),and(requester_id.eq.${requestedId},requested_id.eq.${currentUser.id})`
        )
        .maybeSingle();
  
      if (existingRequestError) throw existingRequestError;
  
      if (existingRequest?.status === 'pending') {
        alert('Та аль хэдийн болзооны санал явуулсан байна.');
        return;
      }
  
      if (existingRequest?.status === 'accepted') {
        alert('Та энэ хүнтэй аль хэдийн болзож байна.');
        return;
      }
  
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      
      // 📬 Insert new request
      await supabase
        .from('date_requests')
        .insert([
          {
            requester_id: currentUser.id,
            requested_id: requestedId,
            status: 'pending',
            expires_at: expiresAt
          }
        ]);
  
      // 🎁 Update Christma points
      const isRequesterTop3 = top3UserIds.includes(currentUser.id);
      const pointsToAdd = isRequesterTop3 ? 10 : 5;
      const updatedPoints = requestedProfile.christma_points + pointsToAdd;
  
      await supabase
        .from('profiles')
        .update({ christma_points: updatedPoints })
        .eq('id', requestedId);
  
      // 🔔 Notification
      await supabase.from('notifications').insert({
        user_id: null,
        message: `${currentProfile.username} нь ${requestedProfile.username} рүү болзооны санал явууллаа! 💌`,
      });
  
      alert(`Болзооны саналыг явуулсан! ${requestedProfile.username} нь +${pointsToAdd} Christma оноо авлаа.`);
  
      // ✅ Hide button for this user
      setAskedUserIds(prev => [...prev, requestedId]);
  
      // 🔁 Refresh UI
      fetchLeaderboard();
      fetchIncomingDateRequests();
  
    } catch (err) {
      console.error('Error sending date request:', err);
      alert('Болзооны саналыг илгээх үед ямар нэгэн зүйл буруу боллоо.');
    }
  }  
  

  async function handleAccept(requestId, requesterId, requesterUsername) {
    if (activeDate) {
      alert('Та яг одоо болзож байна. Энэ болзоогоо дуусгаад дараагийнхийг эхлүүлнэ үү');
      return;
    }
  
    try {
      // 1. Fetch the date request
      const { data: dateData, error: dateError } = await supabase
        .from('date_requests')
        .select('*')
        .eq('id', requestId)
        .single();
  
      if (dateError) throw dateError;
  
      // 2. Check if either user is already in a relationship
      const datingFilter =
        `user1_id.eq.${currentUser.id},` +
        `user2_id.eq.${currentUser.id},` +
        `user1_id.eq.${dateData.requester_id},` +
        `user2_id.eq.${dateData.requester_id}`;
  
      const { data: existingDating, error: datingCheckError } = await supabase
        .from('dating')
        .select('id')
        .or(datingFilter);
  
      if (datingCheckError) throw datingCheckError;
  
      if (existingDating && existingDating.length > 0) {
        alert('Энэ хэрэглэгч эсвэл та аль хэдийн болзож байна.');
  
        // Cancel this request since someone is already dating
        await supabase
          .from('date_requests')
          .update({ status: 'cancelled' })
          .eq('id', requestId);
  
        fetchIncomingDateRequests();
        return;
      }
  
      // 3. Mark request accepted
      const { error: acceptError } = await supabase
        .from('date_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
  
      if (acceptError) throw acceptError;
  
      // 4. Fetch profiles
      const { data: profilesData, error: fetchError } = await supabase
        .from('profiles')
        .select('id, date_count, christma_points')
        .in('id', [currentUser.id, dateData.requester_id]);
  
      if (fetchError) throw fetchError;
  
      const currentUserProfile = profilesData.find(
        p => p.id === currentUser.id
      );
      const requesterProfile = profilesData.find(
        p => p.id === dateData.requester_id
      );
  
      const newCurrentUserCount =
        (currentUserProfile?.date_count || 0) + 1;
  
      const newRequesterCount =
        (requesterProfile?.date_count || 0) + 1;
  
      // 5. Get requester's username
      const { data: requesterProfileData, error: usernameError } =
        await supabase
          .from('profiles')
          .select('username')
          .eq('id', dateData.requester_id)
          .single();
  
      if (usernameError) throw usernameError;
  
      requesterUsername = requesterProfileData.username;
  
      // 6. Update date counts
      await supabase
        .from('profiles')
        .update({ date_count: newCurrentUserCount })
        .eq('id', currentUser.id);
  
      await supabase
        .from('profiles')
        .update({ date_count: newRequesterCount })
        .eq('id', dateData.requester_id);
  
      // 7. Create dating relationship
      const { data: couple, error: datingError } = await supabase
        .from('dating')
        .insert([
          {
            user1_id: dateData.requester_id,
            user2_id: currentUser.id,
          },
        ])
        .select()
        .single();
  
      if (datingError) throw datingError;
  
      // 8. Cancel every other pending request involving either user
      const cancelFilter =
        `requester_id.eq.${currentUser.id},` +
        `requested_id.eq.${currentUser.id},` +
        `requester_id.eq.${dateData.requester_id},` +
        `requested_id.eq.${dateData.requester_id}`;
  
      await supabase
        .from('date_requests')
        .update({ status: 'cancelled' })
        .eq('status', 'pending')
        .neq('id', requestId)
        .or(cancelFilter);
  
      // 9. Give requester 5 Christma Points
      const updatedRequesterPoints =
        (requesterProfile?.christma_points || 0) + 5;
  
      await supabase
        .from('profiles')
        .update({ christma_points: updatedRequesterPoints })
        .eq('id', dateData.requester_id);
  
      // 10. Notification
      await supabase.from('notifications').insert({
        user_id: null,
        message: `${currentUser.username} нь ${requesterUsername} ий болзооны саналыг зөвшөөрлөө! 💕`,
      });
  
      // 11. Assign random task
      await assignRandomTaskToCouple(couple.id);
  
      alert('Та болзооны саналыг хүлээж авлаа!');
  
      fetchActiveDate();
      fetchIncomingDateRequests();
      fetchLeaderboard();
  
    } catch (err) {
      console.error('Error accepting date request:', err);
      alert('Болзооны саналыг зөвшөөрөх үед ямар нэгэн юм буруу боллоо.');
    }
  }
   
  


  async function handleReject(requestId) {
    try {
      const { data: requester} = await supabase
        .from('date_requests')
        .select('requester_id')
        .eq('id', requestId)
        .single();

      await supabase
        .from('date_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      const { data: name} = await supabase
        .from('profiles')
        .select('username')
        .eq('id', requester.requester_id)
        .single();

      await supabase.from('notifications').insert({
        user_id: null,
        message: `${currentUser.username} rejected ${name.username}'s date request.`,
      });

      alert('You rejected the date request.');
      fetchIncomingDateRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  }

  // ONLY ADDED THIS FUNCTION
  async function endDate() {
    if (!activeDate) return;
  
    try {
      // 1️⃣ Find the active dating record
      const { data: datingRow, error: datingError } = await supabase
        .from('dating')
        .select('id, started_at, user1_id, user2_id')
        .is('ended_at', null)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .single();
  
      if (datingError || !datingRow) {
        console.error('Error fetching dating record:', datingError);
        alert('Идэвхтэй болзоо олдсонгүй.');
        return;
      }
  
      // 2️⃣ Check if 24 hours have passed
      const startedAtUTC = Date.parse(datingRow.started_at);
      const nowUTC = Date.now();
  
      const diffMs = nowUTC - startedAtUTC;
  
      if (diffMs < 24 * 60 * 60 * 1000) {
        const remainingMs = 24 * 60 * 60 * 1000 - diffMs;
  
        const remainingHours = Math.floor(
          remainingMs / (1000 * 60 * 60)
        );
  
        const remainingMinutes = Math.floor(
          (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
        );
  
        alert(
          `Та багадаа 24 цаг болзох ёстой. ${remainingHours} цаг ${remainingMinutes} минутын дараа дахин үзнэ үү.`
        );
  
        return;
      }
  
      // 3️⃣ Mark the dating relationship as ended
      const { error: endDatingError } = await supabase
        .from('dating')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', datingRow.id);
  
      if (endDatingError) throw endDatingError;
  
      // 4️⃣ Mark the accepted request as ended
      await supabase
        .from('date_requests')
        .update({ status: 'ended' })
        .eq('status', 'accepted')
        .or(
          `requester_id.eq.${datingRow.user1_id},requested_id.eq.${datingRow.user2_id}`
        );
  
      // 5️⃣ Fetch usernames
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', datingRow.user1_id)
        .single();
  
      const { data: requestedProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', datingRow.user2_id)
        .single();
  
      // 6️⃣ Send notification
      await supabase.from('notifications').insert({
        user_id: null,
        message: `💔 ${requesterProfile.username} ба ${requestedProfile.username} болзоогоо дуусгалаа.`,
      });
  
      alert('Та болзоогоо дуусгалаа.');
  
      setActiveDate(null);
  
      fetchActiveDate();
      fetchIncomingDateRequests();
      fetchLeaderboard();
  
    } catch (err) {
      console.error('Error ending date:', err);
      alert('Болзоог дуусгах үед алдаа гарлаа.');
    }
  }
  

  // ✅ define this inside the component
  const handleViewProfile = (userId) => {
    navigate(`/profile-view/${userId}`);
  }

  function UserCard({
    user, rank, onLike, onAskDate, onViewProfile,
    currentUser, top3UserIds, onBan, onUnban, isBanned, isSelf, bannedUser,
    assignTask // pass this function from parent
  }) {
    const [showTaskInput, setShowTaskInput] = useState(false);
    const [taskInput, setTaskInput] = useState('');

    const isTop3User = top3UserIds.includes(currentUser?.id);
    const isUserTop3Rank = rank < 3;

    return (
      <li style={{
        listStyle: 'none',
        marginBottom: '20px',
        backgroundColor: isUserTop3Rank || user.is_admin ? '#fffae6' : 'transparent',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: isUserTop3Rank || user.is_admin ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
      }}>      
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {user.profile_pic && (
            <img
              src={user.profile_pic}
              alt={`${user.nickname || 'User'}'s avatar`}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                marginRight: '10px',
                objectFit: 'cover',
              }}
            />          
          )}
          <div style={{ flexGrow: 1 }}>
            <strong>#{rank + 1}</strong> {user.nickname}
            {!user.is_admin && <> | {user.christma_points}✨</>}
            <br />
            Хүйс: {user.gender}
          </div>

          <div>
            {!user.is_admin && !currentUser?.is_admin && (
              <>
                <button onClick={() => onLike(user.id)}>❤  Like</button>
                {!askedUserIds.includes(user.id) && (
                  <button onClick={() => onAskDate(user.id)}>💌  Болзоо</button>
                )}
              </>
            )}
            <button onClick={() => onViewProfile(user.id)}>👀 Profile үзэх</button>

            {currentUser?.is_admin && !user.is_admin && (
              <button
                onClick={() => navigate(`/admin-bonus/${user.id}`)}
                style={{
                  color: "black"
                }}
              >
                🎁 Bonus
              </button>
            )}

            {isTop3User && !isSelf && !user.is_admin && (
              isBanned
                ? <button onClick={() => onUnban(user.id)} style={{ backgroundColor: 'green', color: 'white' }}>
                    ✅  Unban
                  </button>
                : <button onClick={() => onBan(user.id)} style={{ backgroundColor: 'red', color: 'white' }}>
                    🚫  Ban
                  </button>
            )}

            {currentUser?.is_admin && isBanned && !user.is_admin && (
              <button
                onClick={() => onUnban(user.id)}
                style={{ backgroundColor: 'green', color: 'white' }}
              >
                ✅ Unban (Admin)
              </button>
            )}

            {isTop3User && isBanned && (
              <>
                <button onClick={() => setShowTaskInput(!showTaskInput)} style={{ backgroundColor: 'orange', color: 'white' }}>
                  📝 Даалгавар
                </button>
                {showTaskInput && (
                  <div>
                    <input
                      type="text"
                      placeholder="Даалгавараа оруулна уу"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                    />
                    <button onClick={() => {
                      assignTask(user.id, taskInput); // send task
                      setShowTaskInput(false);
                      setTaskInput('');
                    }}>
                      Даалгавар илгээх
                    </button>
                  </div>
                )}
              </>
            )}
            <button onClick={() => setActiveReportId(user.id)}>
              🚩 Report
            </button>

            {activeReportId === user.id && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  placeholder="Report reason"
                  value={reportReasons[user.id] || ''}
                  onChange={(e) =>
                    setReportReasons(prev => ({
                      ...prev,
                      [user.id]: e.target.value,
                    }))
                  }
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
                <br />
                <button onClick={() => handleSubmitReport(user.id)} style={{ marginTop: '5px' }}>
                  Submit Report
                </button>
              </div>
            )}
          </div>
        </div>
      </li>
    );
  }


  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <button onClick={() => navigate('/profile')} style={{ marginBottom: 20 }}>
        🔙 Profile руу буцах
      </button>
      <button onClick={() => navigate('/notifications')} style={{ marginBottom: 10 }}>
        📢 Бүх мэдэгдэлүүд (Public Notifications)
      </button>

      {activeDate && (
      <div style={{ margin: '20px 0', textAlign: 'center' }}>
        <button onClick={endDate} style={{ padding: '10px 20px', backgroundColor: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '5px' }}>
          💔 Болзоог дуусгах
        </button>
      </div>
    )}

      {/* Single user task UI */}
      {!activeDate && myTask && (
        <div className="p-6 mb-6 bg-yellow-200 border-4 border-yellow-500 rounded-xl shadow-lg animate-pulse text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">🚨 Таньд даалгавар ирсэн байна! 🚨</h2>
          <h3 className="text-xl text-gray-800">Таны даалгавар: <u>{myTask}</u>!!!</h3>
        </div>
      )}

      {/* Couple task UI */}
      {activeDate && datingTask &&(
        <div className="p-6 mb-6 bg-pink-100 border-4 border-pink-400 rounded-xl shadow-lg animate-pulse text-center">
          <h2 className="text-2xl font-bold text-pink-600 mb-2">💑 Хосын даалгавар! 💑</h2>
          <h3 className="text-2xl font-bold text-pink-600 mb-2">Ямар нэгэн юм болвол манай web асуудал хүлээхгүйг анхааруулья!</h3>
          <h3 className="text-xl text-gray-800">Та хоёрын хамтарсан даалгавар: <u>{datingTask}</u></h3>
        </div>
      )}

      {incomingDateRequests.length > 0 && (
          <div
            style={{
            marginTop: 30,
            padding: 15,
            border: '1px solid #ccc',
            borderRadius: 8,
          }}
        >
          <h3>📩 Чамд ирсэн болзох саналууд</h3>
          <ul style={{ padding: 0 }}>
            {incomingDateRequests.map((request) => (
              <DateRequestCard
                key={request.id}
                request={request}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </ul>
        </div>
      )}
      
      <h2>Ранк 🏆</h2>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {!loading && !error && (
        <>
            {users.map((user, index) => (
              <UserCard 
                key={user.id}
                user={user}
                rank={index}
                onLike={onLike}
                onAskDate={onAskDate}
                onViewProfile={handleViewProfile}
                currentUser={currentUser}
                top3UserIds={top3UserIds}
                onBan={handleBanUser}
                onUnban={handleUnbanUser}
                isBanned={bannedUserIds.has(user.id)}
                isSelf={user.id === currentUser.id || top3UserIds.includes(user.id)}
                assignTask={assignTask}
              />
            ))}
        </>
      )}
      {adminUsers.length > 0 && (
        <>
          <hr />
          <h3>👑 Admin Accounts</h3>
          {adminUsers.map((user, index) => (
            <UserCard
              key={user.id}
              user={user}
              rank={index}
              onLike={() => {}}
              onAskDate={() => {}}
              onViewProfile={handleViewProfile}
              currentUser={currentUser}
              top3UserIds={top3UserIds}
              onBan={() => {}}
              onUnban={() => {}}
              isBanned={false}
              isSelf={false}
              assignTask={() => {}}
            />
          ))}
        </>
      )}
      <hr></hr>
      <h3>Үүсгэн байгуулагч: Nazuke</h3>
    </div>
  );
}
