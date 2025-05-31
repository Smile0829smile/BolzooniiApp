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
          <strong>{requester?.username || 'Unknown'}</strong> wants to go on a date with you!{' '}
          {status === 'pending' ? '' : `(${status})`}
        </span>
      </div>
      {status === 'pending' && (
        <div>
          <button onClick={() => onAccept(id, requester?.username)} style={{ marginRight: '5px' }}>
            ✅ Accept
          </button>
          <button onClick={() => onReject(id)}>❌ Reject</button>
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
      "Багийн зурагаа өөрийнхөө про гийн 3 зурагт хийх.",
      "Нэгнийгээ зурах.",
      "Хамт кино үзэх.",
      "Нэгэндээ хийж байсан хамгийн тэнэг зүйлээ хэлэх.",
      "Нэгнийгээ 3 үгээр илэрхийлэх.",
    ];
  
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
  
    // Insert tasks for both users
    const insertRes = await supabase.from('couple_task').insert([
      {
        assigner_id: null,
        assignee_id: user1_id,
        task_text: randomTask,
        assigned_at: new Date(),
        completed: false,
        partner_rated: false,
        partner_rating: null,
      },
      {
        assigner_id: null,
        assignee_id: user2_id,
        task_text: randomTask,
        assigned_at: new Date(),
        completed: false,
        partner_rated: false,
        partner_rating: null,
      },
    ]);
  
    if (insertRes.error) {
      console.error('Error assigning couple task:', insertRes.error);
      return;
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
  
    if (error) {
      console.error('Error assigning task:', error);
      alert('Даалгавар өгөлт амжилтгүй.');
    } else {
      // Also send a public notification
      await supabase.from('notifications').insert({
        user_id: null,
        message: `${currentUser.username} д даалгавар ирлээ. Даалгавар нь "${assigneeId}". 🧠`,
      });
  
      alert('Даалгавар амжилттай өгөгдлөө!');
    }
  };
  
  const handleReport = async (reportedId) => {
    const reason = prompt("Энэ хэрэглэгчийг ямар шалтгаанаас болж мэдэгдэж байгаагаа тайлбарлана уу:");
    if (!reason) return;
  
    const { data, error } = await supabase.from('reports').insert({
      reporter_id: currentUser.id,
      reported_id: reportedId,
      reason: reason,
    });
  
    if (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } else {
      alert("Thank you. The report has been submitted.");
    }
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

    const { data: bans, error } = await supabase
      .from('bans')
      .select('banned_user_id')
      .eq('banned_by_id', currentUser.id);

    const { date: profiles} = await supabase
      .from('profiles')
      .select('is_banned, id')
      .eq('id', bans.banned_user_id)
      .eq('is_banned', true)

    if (error) {
      console.error('Error fetching bans:', error);
      return;
    }

    const filteredBans = bans.filter(bans => !top3Ids.includes(bans.banned_user_id));

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
    await supabase
      .from('bans')
      .delete()
      .eq('banned_user_id', unbanUserId)
      .eq('banned_by_id', currentUser.id); // FIXED HERE
    
    // Fetch banned user's username for notification
    const { data: unBannedUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', unbanUserId)
      .single();


    // Insert notification AFTER successful ban
    await supabase.from('notifications').insert({
      user_id: null, // or the user you want to notify if any
      message: `${currentUser.username} нь ${unBannedUserProfile.username} ийг бангаас гаргалаа! ✅`,
    });

    await fetchBans();
  }


  async function isUserDating(userId) {
    const { data, error } = await supabase
      .from('dating')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(1)
      .single();
  
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking dating status:', error);
      return false; // Assume not dating if error
    }
  
    return !!data; // true if a dating row exists, false otherwise
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
        .select('id, username')
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
      const { data } = await supabase
        .from('profiles')
        .select('id, username, profile_pic, christma_points, gender')
        .order('christma_points', { ascending: false })
        .limit(500);

      setUsers(data);
      setTop3UserIds(data.slice(0, 3).map((u) => u.id));
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
        .select('id, requester_id, status, created_at')
        .eq('requested_id', currentUser.id)
        .order('created_at', { ascending: false });

      const requesterIds = requests.map((r) => r.requester_id);
      const { data: requestersProfiles } = await supabase
        .from('profiles')
        .select('id, username, profile_pic')
        .in('id', requesterIds);

      const combined = requests.map((r) => ({
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
      // Ban check
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
  
      // Check if you liked this user today
      const { data: existingLikes, error: likeError } = await supabase
        .from('likes')
        .select('id, created_at')
        .eq('liker_id', currentUser.id)
        .eq('liked_id', likedUserId)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()); // since today 00:00:00
  
      if (likeError) throw likeError;
  
      if (existingLikes && existingLikes.length > 0) {
        alert('Та энэ хүн рүү аль хэдийн like явуулсан байна! Маргааш дахин оролдоно уу.');
        return;
      }
  
      // Get liked user profile
      const { data: likedUser, error: userError } = await supabase
        .from('profiles')
        .select('username, christma_points, like_count')
        .eq('id', likedUserId)
        .single();
  
      if (userError) throw userError;
  
      // Insert like record
      await supabase.from('likes').insert({
        liker_id: currentUser.id,
        liked_id: likedUserId,
        created_at: new Date()
      });
  
      // Update liked user's Christma points +2 and like_count +1
      const updatedPoints = likedUser.christma_points + 2;
      const updatedLikeCount = likedUser.like_count + 1;
      await supabase
        .from('profiles')
        .update({ christma_points: updatedPoints, like_count: updatedLikeCount })
        .eq('id', likedUserId);
  
      // Insert notification
      await supabase.from('notifications').insert({
        user_id: null,
        message: `${currentUser.username} нь ${likedUser.username} рүү like явууллаа! ❤️`,
      });
  
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
      // 🚫 Ban check: has currentUser banned the requested user OR been banned by them?
      // Check if either currentUser or requested user is banned by ANYONE
      const { data: bannedUsers, error: bannedUsersError } = await supabase
        .from('bans')
        .select('banned_user_id')
        .in('banned_user_id', [currentUser.id, requestedId]);

      if (bannedUsersError) throw bannedUsersError;

      if (bannedUsers && bannedUsers.length > 0) {
      // Determine who is banned
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
  
      // 📬 Insert new request
      await supabase
        .from('date_requests')
        .insert([{ requester_id: currentUser.id, requested_id: requestedId, status: 'pending' }]);
  
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
        message: `${currentProfile.username} нь ${requestedProfile.username} ээс болзооны санал явууллаа! 💌`,
      });
  
      alert(`Болзооны саналыг явуулсан! ${requestedProfile.username} нь +${pointsToAdd} Christma оноо авлаа.`);
  
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
      // 1. Mark the request as accepted
      const { error: acceptError } = await supabase
        .from('date_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
  
      if (acceptError) throw acceptError;
  
      // 2. Fetch the date request to get requester_id (in case requesterId is unreliable)
      const { data: dateData, error: dateError } = await supabase
        .from('date_requests')
        .select('*')
        .eq('id', requestId)
        .single();
  
      if (dateError) throw dateError;
  
      // 3. Fetch date_count for both users
      const { data: profilesData, error: fetchError } = await supabase
        .from('profiles')
        .select('id, date_count')
        .in('id', [currentUser.id, dateData.requester_id]);
  
      if (fetchError) throw fetchError;
  
      const currentUserProfile = profilesData.find(p => p.id === currentUser.id);
      const requesterProfile = profilesData.find(p => p.id === dateData.requester_id);
  
      // Increment their date counts
      const newCurrentUserCount = (currentUserProfile?.date_count || 0) + 1;
      const newRequesterCount = (requesterProfile?.date_count || 0) + 1;

      // Fetch the requester's username if not passed in
      const { data: requesterProfileData, error: usernameError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', dateData.requester_id)
        .single();

      if (usernameError) throw usernameError;

      const requesterUsername = requesterProfileData.username;

  
      // 4. Update currentUser date_count
      const { error: updateCurrentUserError } = await supabase
        .from('profiles')
        .update({ date_count: newCurrentUserCount })
        .eq('id', currentUser.id);
  
      if (updateCurrentUserError) throw updateCurrentUserError;
  
      // 5. Update requester date_count
      const { error: updateRequesterError } = await supabase
        .from('profiles')
        .update({ date_count: newRequesterCount })
        .eq('id', dateData.requester_id);
  
      if (updateRequesterError) throw updateRequesterError;
  
      console.log(`✅ date_count incremented: currentUser=${newCurrentUserCount}, requester=${newRequesterCount}`);
  
      // 6. Insert into dating table
      const { data: couple, error: datingError } = await supabase
        .from('dating')
        .insert([{ user1_id: dateData.requester_id, user2_id: currentUser.id }])
        .select()
        .single();
  
      if (datingError) throw datingError;
  
      console.log('✅ Couple created with id:', couple.id);
  
      
      // 7. Optional notification
      await supabase.from('notifications').insert({
        user_id: null,
        message: `${currentUser.username} нь ${requesterUsername} ий болзооны саналыг зөвшөөрлөө! 💕`,
      });

      // 8. Assign a random task to the new couple
      await assignRandomTaskToCouple(couple.id);
  
      // 9. Refresh UI state
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
      // Fetch the date request record
      const { data: dateRequest, error } = await supabase
        .from('date_requests')
        .select('id, created_at, requester_id, requested_id')
        .eq('id', activeDate.id)
        .single();
  
      if (error) {
        console.error('Error fetching date request:', error);
        return;
      }
  
      const createdAtUTC = new Date(dateRequest.created_at).getTime(); // Supabase timestamp (UTC)
      const nowUTC = new Date().getTime(); // Current time (UTC)
  
      const hoursDiff = (nowUTC - createdAtUTC) / (1000 * 60 * 60);
      console.log('Created At:', new Date(createdAtUTC).toISOString());
      console.log('Now:', new Date(nowUTC).toISOString());
      console.log('Hour Difference:', hoursDiff);
  
      if (hoursDiff < 24) {
        const remainingMs = (24 - hoursDiff) * 60 * 60 * 1000;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        alert(`Та багадаа 1 бүтэн өдөр болзох ёстой. ${remainingHours} цаг ${remainingMinutes} минутын дараа дахин үзнэ үү.`);
        return;
      }      
  
      // End the date
      await supabase
        .from('date_requests')
        .update({ status: 'ended' })
        .eq('id', activeDate.id);
  
      // Get both usernames
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', dateRequest.requester_id)
        .single();
  
      const { data: requestedProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', dateRequest.requested_id)
        .single();
  
      // Notify everyone
      await supabase.from('notifications').insert({
        user_id: null,
        message: `💔 ${requesterProfile.username} ба ${requestedProfile.username} болзоогоо дуусгалаа.`,
      });
  
      alert('Та болзоогоо дуусгалаа.');
  
      setActiveDate(null);
      fetchLeaderboard();
      fetchIncomingDateRequests();
    } catch (err) {
      console.error('Error ending date:', err);
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
        backgroundColor: isUserTop3Rank ? '#fffae6' : 'transparent',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: isUserTop3Rank ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {user.profile_pic && (
            <img
              src={user.profile_pic}
              alt={`${user.username}'s avatar`}
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
            <strong>#{rank + 1}</strong> {user.username} | {user.christma_points} ✨
            <br />
            Хүйс: {user.gender}
          </div>

          <div>
            <button onClick={() => onLike(user.id)}>❤️ Like</button>
            <button onClick={() => onAskDate(user.id)}>💌 Болзоо</button>
            <button onClick={() => onViewProfile(user.id)}>👀 Profile үзэх</button>

            {isTop3User && !isSelf && (
              isBanned
                ? <button onClick={() => onUnban(user.id)} style={{ backgroundColor: 'green', color: 'white' }}>
                    ✅ Unban
                  </button>
                : <button onClick={() => onBan(user.id)} style={{ backgroundColor: 'red', color: 'white' }}>
                    🚫 Ban
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

          <button
            onClick={() => handleReport(user.id)}
            style={{
              backgroundColor: '#f8d7da',      // light red/pink background
              color: '#721c24',               // dark red text
              fontSize: '0.8rem',             // smaller font
              padding: '4px 8px',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              marginTop: '4px',
              cursor: 'pointer',
            }}
          >
            🚩 Report
          </button>
          </div>
        </div>
      </li>
    );
  }

  async function handleVote(vote) {
    if (!activeDate || !datingTask) {
      alert('No active task or date.');
      return;
    }
  
    try {
      const points = vote === 'nice' ? 8 : 1;
  
      // Update Christma points for the current user
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          christma_points: supabase.raw('christma_points + ?', [points]),
        })
        .eq('id', currentUser.id);
  
      if (updateError) throw updateError;
  
      // Optionally mark task as completed or record vote in a table
  
      alert(`You gave a "${vote}" vote and earned ${points} Christma points!`);
  
      // Fetch a new task if needed, or just refetch the current one
      // e.g., await fetchDatingTask();
  
    } catch (err) {
      console.error('Error handling vote:', err);
      alert('Failed to record your vote.');
    }
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
          <h3 className="text-xl text-gray-800">Та хоёрын хамтарсан даалгавар: <u>{datingTask}</u></h3>

          <h3 className="mt-4 text-lg text-gray-700">Хосынхоо даалгаврыг хэр сайн биелүүлснийг сонгоно уу 🙂</h3>

          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={() => handleVote('nice')}
              className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition"
            >
              👍 Nice
            </button>
            <button
              onClick={() => handleVote('nah')}
              className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition"
            >
              👎 Nah
            </button>
          </div>
        </div>
      )}






      <h2>Ранк</h2>

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
        </>
      )}
    </div>
  );
}
