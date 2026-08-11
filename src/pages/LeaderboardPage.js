//The assign tasks are around 210th row!!!!
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
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
          <strong>
            {requester?.username || 'Unknown'}
          </strong>{' '}
          тань руу болзооны санал явуулсан байна!{' '}
          {status === 'pending'
            ? ''
            : `(${status})`}
        </span>
      </div>

      {status === 'pending' && (
        <div>
          <button
            onClick={() =>
              onAccept(
                id,
                requester?.username
              )
            }
            style={{
              marginRight: '5px',
            }}
          >
            ✅ Зөвшөөрөх
          </button>

          <button
            onClick={() =>
              onReject(id)
            }
          >
            ❌ Татгалзах
          </button>
        </div>
      )}
    </li>
  );
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [top3UserIds, setTop3UserIds] = useState([]);

  const [
    incomingDateRequests,
    setIncomingDateRequests,
  ] = useState([]);

  const [activeDate, setActiveDate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const [
    bannedUserIds,
    setBannedUserIds,
  ] = useState(new Set());

  const [myTask, setMyTask] = useState('');
  const [datingTask, setDatingTask] = useState(null);

  const [
    activeReportId,
    setActiveReportId,
  ] = useState(null);

  const [
    reportReasons,
    setReportReasons,
  ] = useState({});

  const [
    askedUserIds,
    setAskedUserIds,
  ] = useState([]);

  const [
    adminUsers,
    setAdminUsers,
  ] = useState([]);

  const [
    creatorUsers,
    setCreatorUsers,
  ] = useState([]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchBans();
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchLeaderboard();
      fetchIncomingDateRequests();
      fetchActiveDate();
      fetchBans();
      fetchDatingTask();
    }
  }, [currentUser]);

  // =====================================================
  // RANDOM COUPLE TASK
  // =====================================================

  async function assignRandomTaskToCouple(coupleId) {
    try {
      const {
        data: couple,
        error: coupleError,
      } = await supabase
        .from('dating')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .single();

      if (coupleError) {
        throw coupleError;
      }

      if (!couple) {
        throw new Error(
          'Couple олдсонгүй.'
        );
      }

      const {
        user1_id,
        user2_id,
      } = couple;

      const {
        data: profiles,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('id, username, nickname')
        .in('id', [
          user1_id,
          user2_id,
        ]);

      if (profileError) {
        throw profileError;
      }

      const user1 =
        profiles?.find(
          (p) => p.id === user1_id
        );

      const user2 =
        profiles?.find(
          (p) => p.id === user2_id
        );

      const tasks = [
        "Тасралтгүй 2 цаг видео дуудлага хийх. Ярих хугацаандаа зураг зурах. Тэгээд хамгийн гунигтай юм уу хамгийн хөгжилтэй уншсан уран зохиолуудаа ярих.",
        "Өөрсдөө болзоогоо төлөвлөөд YouTube дээр влог болгож оруулах. Тэгээд групп дээр линкээ өгөх.",
        "Хамт кино ямар ч хамаагүй байдлаар үзээд, киноны хамгийн гоё хэсэг юу байсныг ярилцаж, киногоо үнэлэх. Зураг дарвал групп дээр шэйр хийх.",
        "Нэгэндээ тоглодог 2 онлайн, 1 оффлайн тоглоомоо хуваалцах. Тэгээд нэгийг нь сонгоод нэгнийхээ рекордыг эвдэх эсвэл хамт тоглох.",
        "Дуртай 3 дуугаа нэгэнтэйгээ хуваалцаад, нэг дуугаа сонгон хамт дуулаад, тэрийгээ групп дээр шэйр хийх.",
        "30 минутын болзооны сорил. 5 минутанд өдөр тутамдаа юу хийдгээ, 10 минутанд хамгийн их мөрөөддөг зүйлээ, 15 минутанд чөлөөт цагаа хэрхэн өнгөрөөдгөө ярих.",
        "Нэгэнтэйгээ 1 цаг ярингаа нэгнийхээ хувцаснуудыг хараад ямар хувцас өмсөхийг нь зааж өгөх. Тэгээд зургаа даруулаад групп дээр шэйр хийх.",
        "30 минутын турш нөгөө хүнийхээ энгийн хүсэлт, саналд боломжтой бол “Тийм” гэж хариулах.",
        "20 асуулт бэлдэж, бие биенээ илүү сайн таних.",
        "Хамгийн их ашигладаг 10 эможиныхоо утгыг тайлбарлах.",
        "Хамгийн дуртай 10 зургийнхаа түүхийг ярьж өгөх.",
        "Адилхан позтой толины сельфи солилцож, хосынхоо зургийг 24 цаг сторидоо хийх.",
        "Өгсөн сэдвийн дагуу хамтран дууны жагсаалт бүтээх.",
        "3 минут юу ч ярихгүйгээр бие бие рүүгээ харж, харцаа салгалгүй видео дуудлага хийх. Дараа нь ямар санагдсанаа ярилцах.",
        "Бие биедээ зориулж 5 зураг сонгоод, яагаад тэр зураг тухайн хүнийг санагдуулж байгааг тайлбарлах. Тэгээд хамгийн гоё санагдсан нэг зургаа сонгоод 24 цаг сторидоо хийх.",
      ];

      const randomTask =
        tasks[
          Math.floor(
            Math.random() *
            tasks.length
          )
        ];

      const {
        error: oldTaskDeleteError,
      } = await supabase
        .from('couple_task')
        .delete()
        .in(
          'assignee_id',
          [
            user1_id,
            user2_id,
          ]
        );

      if (oldTaskDeleteError) {
        throw oldTaskDeleteError;
      }

      const {
        error: taskError,
      } = await supabase
        .from('couple_task')
        .insert([
          {
            assignee_id:
              user1_id,

            task_text:
              randomTask,
          },

          {
            assignee_id:
              user2_id,

            task_text:
              randomTask,
          },
        ]);

      if (taskError) {
        throw taskError;
      }

      console.log(
        '✅ Couple task created:',
        randomTask
      );

      const name1 =
        user1?.nickname ||
        user1?.username ||
        'User 1';

      const name2 =
        user2?.nickname ||
        user2?.username ||
        'User 2';

      const {
        error: notificationError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id: null,

          message:
            `💑 ${name1}, ${name2} хоёрт шинэ хосын даалгавар ирлээ! Даалгавар: "${randomTask}"`,
        });

      if (notificationError) {
        console.error(
          'Couple task notification error:',
          notificationError
        );
      }

      return randomTask;
    } catch (err) {
      console.error(
        'assignRandomTaskToCouple error:',
        err
      );

      throw err;
    }
  }

  // =====================================================
  // ASSIGN SINGLE TASK
  // =====================================================

  const assignTask = async (
    assigneeId,
    taskText
  ) => {
    const { error } =
      await supabase
        .from('assigned_tasks')
        .insert({
          assigner_id:
            currentUser.id,

          assignee_id:
            assigneeId,

          task_text:
            taskText,
        });

    const { data } =
      await supabase
        .from('profiles')
        .select('username')
        .eq(
          'id',
          assigneeId
        )
        .single();

    if (error) {
      console.error(
        'Error assigning task:',
        error
      );

      alert(
        'Даалгавар өгөлт амжилтгүй.'
      );
    } else {
      await supabase
        .from('notifications')
        .insert({
          user_id: null,

          message:
            `${data.username}-д даалгавар ирлээ. Даалгавар нь "${taskText}". 🧠`,
        });

      alert(
        'Даалгавар амжилттай өгөгдлөө!'
      );
    }
  };

  // =====================================================
  // REPORT
  // =====================================================

  const handleSubmitReport =
    async (reportedId) => {
      const reason =
        reportReasons[
          reportedId
        ] || '';

      if (!reason.trim())
        return;

      const { error } =
        await supabase
          .from('reports')
          .insert({
            reporter_id:
              currentUser.id,

            reported_id:
              reportedId,

            reason:
              reason.trim(),
          });

      if (error) {
        console.error(
          'Supabase insert error:',
          error
        );

        alert(
          'Failed to report'
        );
      } else {
        alert(
          'Reported successfully'
        );

        setActiveReportId(
          null
        );

        setReportReasons(
          (prev) => ({
            ...prev,
            [reportedId]: '',
          })
        );
      }
    };

  // =====================================================
  // MY TASK
  // =====================================================

  useEffect(() => {
    async function fetchMyTask() {
      const {
        data,
        error,
      } = await supabase
        .from('assigned_tasks')
        .select('task_text')
        .eq(
          'assignee_id',
          currentUser.id
        )
        .order(
          'assigned_at',
          {
            ascending: false,
          }
        )
        .limit(1)
        .single();

      if (
        error &&
        error.code !==
          'PGRST116'
      ) {
        console.error(
          'Error fetching task:',
          error
        );
      } else if (data) {
        setMyTask(
          data.task_text
        );
      }
    }

    if (currentUser?.id) {
      fetchMyTask();
    }
  }, [currentUser?.id]);

  // =====================================================
  // TOP 3
  // =====================================================

  async function fetchTop3UserIds() {
    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', false)
      .eq('is_creator', false)
      .order(
        'christma_points',
        {
          ascending: false,
        }
      )
      .limit(3);

    if (!error && data) {
      setTop3UserIds(
        data.map(
          (user) =>
            user.id
        )
      );

      return data.map(
        (user) =>
          user.id
      );
    } else {
      console.error(
        'Failed to fetch top 3 users',
        error
      );

      return [];
    }
  }

  useEffect(() => {
    fetchTop3UserIds();
  }, []);

  // =====================================================
  // FETCH BANS
  // =====================================================

  async function fetchBans() {
    const top3Ids =
      await fetchTop3UserIds();

    let query =
      supabase
        .from('bans')
        .select(
          'banned_user_id'
        );

    if (
      !currentUser.is_admin &&
      !currentUser.is_creator
    ) {
      query =
        query.eq(
          'banned_by_id',
          currentUser.id
        );
    }

    const {
      data: bans,
      error,
    } = await query;

    if (error) {
      console.error(
        'Error fetching bans:',
        error
      );
      return;
    }

    const filteredBans =
      (bans || []).filter(
        (b) =>
          !top3Ids.includes(
            b.banned_user_id
          )
      );

    setBannedUserIds(
      new Set(
        filteredBans.map(
          (b) =>
            b.banned_user_id
        )
      )
    );
  }

  // =====================================================
  // BAN
  // =====================================================

  async function handleBanUser(
    bannedUserId
  ) {
    const top3Ids =
      await fetchTop3UserIds();

    const isCurrentUserTop3 =
      top3Ids.includes(
        currentUser.id
      );

    if (isCurrentUserTop3) {
      const {
        data:
          existingBans,
        error,
      } = await supabase
        .from('bans')
        .select('*')
        .in(
          'banned_by_id',
          top3Ids
        );

      if (error) {
        console.error(
          'Error checking existing bans:',
          error
        );
        return;
      }

      if (
        existingBans.length >=
        1
      ) {
        alert(
          'Эхний гурав дундаа ганц л хүнийг бандах боломжтой. Энэ хэрэглэгчийг бандахын тулд эхлээд бандуулсан байгаа хэрэглэгчийг бангаас нь гаргана уу.'
        );
        return;
      }
    }

    const dating =
      await isUserDating(
        bannedUserId
      );

    if (dating) {
      alert(
        'Та болзож байгаа хэрэглэгчийг бандаж болохгүй.'
      );
      return;
    }

    const {
      data:
        bannedUserProfile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('username')
      .eq(
        'id',
        bannedUserId
      )
      .single();

    if (profileError) {
      console.error(
        'Error fetching banned user profile:',
        profileError
      );

      alert(
        'Failed to fetch banned user info.'
      );

      return;
    }

    const {
      error: insertError,
    } = await supabase
      .from('bans')
      .insert([
        {
          banned_user_id:
            bannedUserId,

          banned_by_id:
            currentUser.id,
        },
      ]);

    if (insertError) {
      console.error(
        'Error banning user:',
        insertError
      );

      alert(
        'Failed to ban user.'
      );

      return;
    }

    // =====================================================
    // CANCEL ALL PENDING DATE REQUESTS FOR BANNED USER
    // =====================================================

    const {
      error: cancelDateRequestsError,
    } = await supabase
      .from('date_requests')
      .update({
        status: 'cancelled',
      })
      .eq(
        'status',
        'pending'
      )
      .or(
        `requester_id.eq.${bannedUserId},requested_id.eq.${bannedUserId}`
      );

    if (cancelDateRequestsError) {
      console.error(
        'Error cancelling banned user date requests:',
        cancelDateRequestsError
      );
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: null,

        message:
          `Эхний гурав ${bannedUserProfile.username} ийг бандлаа! 🚫`,
      });

    alert(
      'Та энэ хүнийг амжилттай бан длаа.'
    );

    await fetchBans();
    fetchLeaderboard();
  }

  // =====================================================
  // UNBAN
  // =====================================================

  async function handleUnbanUser(
    unbanUserId
  ) {
    let query =
      supabase
        .from('bans')
        .delete()
        .eq(
          'banned_user_id',
          unbanUserId
        );

    if (
      !currentUser.is_admin &&
      !currentUser.is_creator
    ) {
      query =
        query.eq(
          'banned_by_id',
          currentUser.id
        );
    }

    const { error } =
      await query;

    if (error) {
      console.error(
        'Error unbanning user:',
        error
      );

      alert(
        'Unban амжилтгүй боллоо.'
      );

      return;
    }

    const {
      data:
        unbannedProfile,
    } = await supabase
      .from('profiles')
      .select('username')
      .eq(
        'id',
        unbanUserId
      )
      .single();

    await supabase
      .from('notifications')
      .insert({
        user_id: null,

        message:
          `${currentUser.username} нь ${unbannedProfile.username} ийг бангаас гаргалаа! ✅`,
      });

    await fetchBans();
    fetchLeaderboard();
  }

  // =====================================================
  // DATING CHECK
  // =====================================================

  async function isUserDating(
    userId
  ) {
    const {
      data,
      error,
    } = await supabase
      .from('date_requests')
      .select('id')
      .or(
        `and(requester_id.eq.${userId},status.eq.accepted),and(requested_id.eq.${userId},status.eq.accepted)`
      )
      .limit(1)
      .maybeSingle();

    if (
      error &&
      error.code !==
        'PGRST116'
    ) {
      console.error(
        'Error checking dating status:',
        error
      );

      return false;
    }

    return !!data;
  }

  // =====================================================
  // CURRENT USER
  // =====================================================

  async function fetchCurrentUser() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'User not logged in'
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, is_admin, is_creator'
        )
        .eq(
          'id',
          user.id
        )
        .single();

      if (profileError) {
        throw profileError;
      }

      setCurrentUser(
        profile
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LEADERBOARD
  // =====================================================

  async function fetchLeaderboard() {
    try {
      setLoading(true);

      const {
        data:
          normalUsers,
        error:
          normalError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, profile_pic, christma_points, gender, is_admin, is_creator'
        )
        .eq(
          'is_admin',
          false
        )
        .eq(
          'is_creator',
          false
        )
        .order(
          'christma_points',
          {
            ascending: false,
          }
        );

      if (normalError) {
        throw normalError;
      }

      const {
        data:
          adminAccounts,
        error:
          adminError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, profile_pic, christma_points, gender, is_admin, is_creator'
        )
        .eq(
          'is_admin',
          true
        )
        .eq(
          'is_creator',
          false
        );

      if (adminError) {
        throw adminError;
      }

      const {
        data:
          creators,
        error:
          creatorError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, profile_pic, christma_points, gender, is_admin, is_creator'
        )
        .eq(
          'is_creator',
          true
        );

      if (creatorError) {
        throw creatorError;
      }

      setUsers(
        normalUsers || []
      );

      setAdminUsers(
        adminAccounts || []
      );

      setCreatorUsers(
        creators || []
      );

      setTop3UserIds(
        (normalUsers || [])
          .slice(0, 3)
          .map(
            (u) => u.id
          )
      );
    } catch (err) {
      console.error(
        'Leaderboard fetch error:',
        err
      );

      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // DATE REQUESTS
  // =====================================================

  async function fetchIncomingDateRequests() {
    if (
      !currentUser?.id
    ) {
      return;
    }

    try {
      const {
        data:
          requests,
      } = await supabase
        .from(
          'date_requests'
        )
        .select(
          'id, requester_id, status, created_at, expires_at'
        )
        .eq(
          'requested_id',
          currentUser.id
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (!requests) {
        setIncomingDateRequests(
          []
        );

        return;
      }

      const now =
        new Date().toISOString();

      for (
        const request of
          requests || []
      ) {
        if (
          request.status ===
            'pending' &&
          request.expires_at &&
          request.expires_at <
            now
        ) {
          await supabase
            .from(
              'date_requests'
            )
            .update({
              status:
                'expired',
            })
            .eq(
              'id',
              request.id
            );

          request.status =
            'expired';
        }
      }

      const requesterIds =
        requests
          .filter(
            (r) =>
              r.status ===
              'pending'
          )
          .map(
            (r) =>
              r.requester_id
          );

      let requestersProfiles =
        [];

      if (
        requesterIds.length >
        0
      ) {
        const {
          data:
            profilesData,
        } = await supabase
          .from('profiles')
          .select(
            'id, username, profile_pic'
          )
          .in(
            'id',
            requesterIds
          );

        requestersProfiles =
          profilesData || [];
      }

      const combined =
        requests
          .filter(
            (r) =>
              r.status ===
              'pending'
          )
          .map((r) => ({
            ...r,

            requester:
              requestersProfiles.find(
                (p) =>
                  p.id ===
                  r.requester_id
              ),
          }));

      setIncomingDateRequests(
        combined
      );
    } catch (err) {
      console.error(
        'Error fetching date requests:',
        err
      );
    }
  }

  // =====================================================
  // ACTIVE DATE
  // =====================================================

  async function fetchActiveDate() {
    if (
      !currentUser?.id
    ) {
      setActiveDate(null);
      return;
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          'date_requests'
        )
        .select('*')
        .or(
          `and(requester_id.eq.${currentUser.id},status.eq.accepted),and(requested_id.eq.${currentUser.id},status.eq.accepted)`
        )
        .maybeSingle();

      if (error) {
        console.error(
          'Error fetching active date:',
          error
        );

        setActiveDate(
          null
        );

        return;
      }

      setActiveDate(
        data || null
      );
    } catch (err) {
      console.error(
        'Error fetching active date:',
        err
      );

      setActiveDate(
        null
      );
    }
  }

  // =====================================================
  // COUPLE TASK
  // =====================================================

  async function fetchDatingTask() {
    if (!currentUser?.id) {
      setDatingTask(null);
      return null;
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from('couple_task')
        .select(
          'id, assignee_id, task_text, assigned_at'
        )
        .eq(
          'assignee_id',
          currentUser.id
        )
        .order(
          'assigned_at',
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setDatingTask(
          data.task_text
        );

        return data;
      }

      setDatingTask(null);
      return null;
    } catch (err) {
      console.error(
        'Fetch couple task error:',
        err
      );

      setDatingTask(null);

      return null;
    }
  }

  useEffect(() => {
    if (!currentUser?.id) {
      setDatingTask(null);
      return;
    }

    if (!activeDate?.id) {
      setDatingTask(null);
      return;
    }

    fetchDatingTask();
  }, [
    currentUser?.id,
    activeDate?.id,
  ]);

  // =====================================================
  // LIKE
  // =====================================================

  async function onLike(
    likedUserId
  ) {
    if (
      !currentUser ||
      currentUser.id ===
        likedUserId
    ) {
      return;
    }

    try {
      const {
        data:
          bannedUsers,
        error:
          bannedUsersError,
      } = await supabase
        .from('bans')
        .select(
          'banned_user_id'
        )
        .in(
          'banned_user_id',
          [
            currentUser.id,
            likedUserId,
          ]
        );

      if (
        bannedUsersError
      ) {
        throw bannedUsersError;
      }

      if (
        bannedUsers &&
        bannedUsers.length >
          0
      ) {
        if (
          bannedUsers.some(
            (b) =>
              b.banned_user_id ===
              currentUser.id
          )
        ) {
          alert(
            'Та бандуулсан байгаа тул like явуулах боломжгүй.'
          );
        } else {
          alert(
            'Энэ хэрэглэгч бандуулсан байгаа тул та like явуулж болохгүй.'
          );
        }

        return;
      }

      const today =
        new Date()
          .toISOString()
          .split('T')[0];

      const {
        data:
          existingLikes,
        error:
          likeCheckError,
      } = await supabase
        .from('likes')
        .select('id')
        .eq(
          'liker_id',
          currentUser.id
        )
        .eq(
          'liked_id',
          likedUserId
        )
        .eq(
          'like_day',
          today
        );

      if (
        likeCheckError
      ) {
        throw likeCheckError;
      }

      if (
        existingLikes.length >
        0
      ) {
        alert(
          'Та энэ хүн рүү аль хэдийн like явуулсан байна! Маргааш дахин оролдоно уу.'
        );

        return;
      }

      const {
        data:
          likedUser,
        error:
          userError,
      } = await supabase
        .from('profiles')
        .select(
          'username, christma_points, like_count'
        )
        .eq(
          'id',
          likedUserId
        )
        .single();

      if (userError) {
        throw userError;
      }

      const now =
        new Date();

      const {
        error:
          insertError,
      } = await supabase
        .from('likes')
        .insert({
          liker_id:
            currentUser.id,

          liked_id:
            likedUserId,

          created_at:
            now.toISOString(),

          like_day:
            today,
        });

      if (insertError) {
        throw insertError;
      }

      const updatedPoints =
        likedUser.christma_points +
        2;

      const updatedLikeCount =
        likedUser.like_count +
        1;

      const {
        error:
          updateError,
      } = await supabase
        .from('profiles')
        .update({
          christma_points:
            updatedPoints,

          like_count:
            updatedLikeCount,
        })
        .eq(
          'id',
          likedUserId
        );

      if (updateError) {
        throw updateError;
      }

      const {
        error:
          notifError,
      } = await supabase
        .from(
          'notifications'
        )
        .insert({
          user_id: null,

          message:
            `${currentUser.username} нь ${likedUser.username} рүү like явууллаа! ❤️`,
        });

      if (notifError) {
        throw notifError;
      }

      alert(
        'Та энэ хүн рүү like явууллаа! Энэ хүн +2 Christma оноо авлаа.'
      );

      fetchLeaderboard();
    } catch (err) {
      console.error(
        'Error liking user:',
        err
      );

      alert(
        'Like явуулахад асуудал гарсан байна. Дахин оролдоно уу.'
      );
    }
  }

  // =====================================================
  // ASK DATE
  // =====================================================

  async function onAskDate(
    requestedId
  ) {
    if (
      !currentUser ||
      currentUser.id ===
        requestedId
    ) {
      return;
    }

    if (activeDate) {
      alert(
        'Та өөр хүнтэй болзож байгаа тул тэр болзоогоо дуусгачихаад шинийг эхлүүлнэ үү.'
      );

      return;
    }

    try {
      const {
        data:
          bannedUsers,
        error:
          bannedUsersError,
      } = await supabase
        .from('bans')
        .select(
          'banned_user_id'
        )
        .in(
          'banned_user_id',
          [
            currentUser.id,
            requestedId,
          ]
        );

      if (
        bannedUsersError
      ) {
        throw bannedUsersError;
      }

      if (
        bannedUsers &&
        bannedUsers.length >
          0
      ) {
        if (
          bannedUsers.some(
            (b) =>
              b.banned_user_id ===
              currentUser.id
          )
        ) {
          alert(
            'Та бан дуулсан байгаа тул болзооны санал явуулах хориотой.'
          );
        } else {
          alert(
            'Таны болзмоор байгаа хүн бан дуулсан байгаа тул банг аас гарахын хүлээнэ үү.'
          );
        }

        return;
      }

      const {
        data:
          todayRequestsCount,
        error:
          todayError,
      } = await supabase.rpc(
        'requests_sent_today',
        {
          user_id:
            currentUser.id,
        }
      );

      if (todayError) {
        throw todayError;
      }

      if (
        todayRequestsCount >
        0
      ) {
        alert(
          'Та өдөрт ганц л болзооны санал явуулах эрхтэй.'
        );

        return;
      }

      const {
        data:
          currentProfile,
        error:
          currentProfileError,
      } = await supabase
        .from('profiles')
        .select(
          'christma_points, gender, username'
        )
        .eq(
          'id',
          currentUser.id
        )
        .single();

      if (
        currentProfileError
      ) {
        throw currentProfileError;
      }

      const {
        data:
          requestedProfile,
        error:
          requestedProfileError,
      } = await supabase
        .from('profiles')
        .select(
          'username, christma_points, date_points, gender'
        )
        .eq(
          'id',
          requestedId
        )
        .single();

      if (
        requestedProfileError
      ) {
        throw requestedProfileError;
      }

      if (
        currentProfile.gender ===
        requestedProfile.gender
      ) {
        alert(
          'Зөвхөн эсрэг хүйстэн рүүгээ болзооны санал явуулна уу.'
        );

        return;
      }

      if (
        currentProfile.christma_points <
        requestedProfile.christma_points
      ) {
        alert(
          'Та зөвхөн өөрөөсөө БАГА оноотой хүн рүү болзооны санал явуулах эрхтэй'
        );

        return;
      }

      const {
        data:
          existingRequest,
        error:
          existingRequestError,
      } = await supabase
        .from(
          'date_requests'
        )
        .select('*')
        .or(
          `and(requester_id.eq.${currentUser.id},requested_id.eq.${requestedId}),and(requester_id.eq.${requestedId},requested_id.eq.${currentUser.id})`
        )
        .maybeSingle();

      if (
        existingRequestError
      ) {
        throw existingRequestError;
      }

      if (
        existingRequest?.status ===
        'pending'
      ) {
        alert(
          'Та аль хэдийн болзооны санал явуулсан байна.'
        );

        return;
      }

      if (
        existingRequest?.status ===
        'accepted'
      ) {
        alert(
          'Та энэ хүнтэй аль хэдийн болзож байна.'
        );

        return;
      }

      const expiresAt =
        new Date(
          Date.now() +
            6 *
              60 *
              60 *
              1000
        ).toISOString();

      await supabase
        .from(
          'date_requests'
        )
        .insert([
          {
            requester_id:
              currentUser.id,

            requested_id:
              requestedId,

            status:
              'pending',

            expires_at:
              expiresAt,
          },
        ]);

      const pointsToAdd =
        Math.floor(
          currentProfile.christma_points *
            0.3
        );

      const updatedPoints =
        requestedProfile.christma_points +
        pointsToAdd;

      const updatedDatePoints =
        (requestedProfile.date_points ||
          0) +
        pointsToAdd;

      await supabase
        .from('profiles')
        .update({
          christma_points:
            updatedPoints,

          date_points:
            updatedDatePoints,
        })
        .eq(
          'id',
          requestedId
        );

      await supabase
        .from(
          'notifications'
        )
        .insert({
          user_id: null,

          message:
            `${currentProfile.username} нь ${requestedProfile.username} рүү болзооны санал явууллаа! 💌`,
        });

      alert(
        `Болзооны саналыг явуулсан! ${requestedProfile.username} нь +${pointsToAdd} Christma оноо авлаа.`
      );

      setAskedUserIds(
        (prev) => [
          ...prev,
          requestedId,
        ]
      );

      fetchLeaderboard();
      fetchIncomingDateRequests();
    } catch (err) {
      console.error(
        'Error sending date request:',
        err
      );

      alert(
        'Болзооны саналыг илгээх үед ямар нэгэн зүйл буруу боллоо.'
      );
    }
  }

  // =====================================================
  // ACCEPT DATE
  // =====================================================

  async function handleAccept(
    requestId,
    requesterId,
    requesterUsername
  ) {
    if (activeDate) {
      alert(
        'Та яг одоо болзож байна. Энэ болзоогоо дуусгаад дараагийнхийг эхлүүлнэ үү'
      );
  
      return;
    }
  
    try {
      const {
        data: dateData,
        error: dateError,
      } = await supabase
        .from('date_requests')
        .select('*')
        .eq('id', requestId)
        .single();
  
      if (dateError) {
        throw dateError;
      }
  
      // =====================================================
      // BAN CHECK BEFORE ACCEPTING
      // =====================================================
  
      const {
        data: bannedDateUsers,
        error: bannedDateUsersError,
      } = await supabase
        .from('bans')
        .select('banned_user_id')
        .in('banned_user_id', [
          currentUser.id,
          dateData.requester_id,
        ]);
  
      if (bannedDateUsersError) {
        throw bannedDateUsersError;
      }
  
      if (
        bannedDateUsers &&
        bannedDateUsers.length > 0
      ) {
        const {
          error: cancelError,
        } = await supabase
          .from('date_requests')
          .update({
            status: 'cancelled',
          })
          .eq('id', requestId);
  
        if (cancelError) {
          throw cancelError;
        }
  
        await fetchIncomingDateRequests();
  
        alert(
          'Энэ болзооны санал хүчингүй болсон байна. Хэрэглэгчдийн нэг нь бандуулсан байна.'
        );
  
        return;
      }
  
      // =====================================================
      // MAKE SURE REQUEST IS STILL PENDING
      // =====================================================
  
      if (dateData.status !== 'pending') {
        await fetchIncomingDateRequests();
  
        alert(
          'Энэ болзооны санал идэвхгүй болсон байна.'
        );
  
        return;
      }
  
      // =====================================================
      // CHECK EXISTING DATING
      // =====================================================
  
      const datingFilter =
        `user1_id.eq.${currentUser.id},` +
        `user2_id.eq.${currentUser.id},` +
        `user1_id.eq.${dateData.requester_id},` +
        `user2_id.eq.${dateData.requester_id}`;
  
      const {
        data: existingDating,
        error: datingCheckError,
      } = await supabase
        .from('dating')
        .select('id')
        .or(datingFilter);
  
      if (datingCheckError) {
        throw datingCheckError;
      }
  
      if (
        existingDating &&
        existingDating.length > 0
      ) {
        alert(
          'Энэ хэрэглэгч эсвэл та аль хэдийн болзож байна.'
        );
  
        await supabase
          .from('date_requests')
          .update({
            status: 'cancelled',
          })
          .eq('id', requestId);
  
        fetchIncomingDateRequests();
  
        return;
      }
  
      // =====================================================
      // ACCEPT REQUEST
      // =====================================================
  
      const {
        error: acceptError,
      } = await supabase
        .from('date_requests')
        .update({
          status: 'accepted',
        })
        .eq('id', requestId)
        .eq('status', 'pending');
  
      if (acceptError) {
        throw acceptError;
      }
  
      // =====================================================
      // GET BOTH PROFILES
      // =====================================================
  
      const {
        data: profilesData,
        error: fetchError,
      } = await supabase
        .from('profiles')
        .select(
          'id, date_count, christma_points, date_points'
        )
        .in('id', [
          currentUser.id,
          dateData.requester_id,
        ]);
  
      if (fetchError) {
        throw fetchError;
      }
  
      const currentUserProfile =
        profilesData.find(
          (p) =>
            p.id === currentUser.id
        );
  
      const requesterProfile =
        profilesData.find(
          (p) =>
            p.id === dateData.requester_id
        );
  
      const newCurrentUserCount =
        (currentUserProfile?.date_count || 0) +
        1;
  
      const newRequesterCount =
        (requesterProfile?.date_count || 0) +
        1;
  
      // =====================================================
      // GET REQUESTER USERNAME
      // =====================================================
  
      const {
        data: requesterProfileData,
        error: usernameError,
      } = await supabase
        .from('profiles')
        .select('username')
        .eq(
          'id',
          dateData.requester_id
        )
        .single();
  
      if (usernameError) {
        throw usernameError;
      }
  
      requesterUsername =
        requesterProfileData.username;
  
      // =====================================================
      // UPDATE DATE COUNTS
      // =====================================================
  
      const {
        error: updateCurrentUserError,
      } = await supabase
        .from('profiles')
        .update({
          date_count:
            newCurrentUserCount,
        })
        .eq(
          'id',
          currentUser.id
        );
  
      if (updateCurrentUserError) {
        throw updateCurrentUserError;
      }
  
      const {
        error: updateRequesterError,
      } = await supabase
        .from('profiles')
        .update({
          date_count:
            newRequesterCount,
        })
        .eq(
          'id',
          dateData.requester_id
        );
  
      if (updateRequesterError) {
        throw updateRequesterError;
      }
  
      // =====================================================
      // CREATE DATING ROW
      // =====================================================
  
      const {
        data: couple,
        error: datingError,
      } = await supabase
        .from('dating')
        .insert([
          {
            user1_id:
              dateData.requester_id,
  
            user2_id:
              currentUser.id,
          },
        ])
        .select()
        .single();
  
      if (datingError) {
        throw datingError;
      }
  
      // =====================================================
      // CANCEL OTHER PENDING REQUESTS
      // =====================================================
  
      const cancelFilter =
        `requester_id.eq.${currentUser.id},` +
        `requested_id.eq.${currentUser.id},` +
        `requester_id.eq.${dateData.requester_id},` +
        `requested_id.eq.${dateData.requester_id}`;
  
      const {
        error: cancelOthersError,
      } = await supabase
        .from('date_requests')
        .update({
          status: 'cancelled',
        })
        .eq(
          'status',
          'pending'
        )
        .neq(
          'id',
          requestId
        )
        .or(
          cancelFilter
        );
  
      if (cancelOthersError) {
        console.error(
          'Error cancelling other date requests:',
          cancelOthersError
        );
      }
  
      // =====================================================
      // GIVE REQUESTER DATE POINTS
      // 10% OF ACCEPTING USER'S POINTS + 10
      // =====================================================
  
      const pointsToAdd =
        Math.floor(
          (currentUserProfile?.christma_points ||
            0) *
            0.1
        ) +
        10;
  
      const updatedRequesterPoints =
        (requesterProfile?.christma_points ||
          0) +
        pointsToAdd;
  
      const updatedRequesterDatePoints =
        (requesterProfile?.date_points ||
          0) +
        pointsToAdd;
  
      const {
        error: pointsError,
      } = await supabase
        .from('profiles')
        .update({
          christma_points:
            updatedRequesterPoints,
  
          date_points:
            updatedRequesterDatePoints,
        })
        .eq(
          'id',
          dateData.requester_id
        );
  
      if (pointsError) {
        throw pointsError;
      }
  
      // =====================================================
      // NOTIFICATION
      // =====================================================
  
      const {
        error: notificationError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id: null,
  
          message:
            `${currentUser.username} нь ${requesterUsername} ий болзооны саналыг зөвшөөрлөө! 💕`,
        });
  
      if (notificationError) {
        console.error(
          'Date notification error:',
          notificationError
        );
      }
  
      // =====================================================
      // ASSIGN COUPLE TASK
      // =====================================================
  
      await assignRandomTaskToCouple(
        couple.id
      );
  
      await fetchDatingTask();
  
      alert(
        'Та болзооны саналыг хүлээж авлаа!'
      );
  
      // =====================================================
      // REFRESH
      // =====================================================
  
      await fetchActiveDate();
      fetchIncomingDateRequests();
      fetchLeaderboard();
    } catch (err) {
      console.error(
        'Error accepting date request:',
        err
      );
  
      alert(
        'Болзооны саналыг зөвшөөрөх үед ямар нэгэн юм буруу боллоо.'
      );
    }
  }

  // =====================================================
  // REJECT DATE
  // =====================================================

  async function handleReject(
    requestId
  ) {
    try {
      const {
        data:
          requester,
      } = await supabase
        .from(
          'date_requests'
        )
        .select(
          'requester_id'
        )
        .eq(
          'id',
          requestId
        )
        .single();

      await supabase
        .from(
          'date_requests'
        )
        .update({
          status:
            'rejected',
        })
        .eq(
          'id',
          requestId
        );

      const {
        data: name,
      } = await supabase
        .from('profiles')
        .select(
          'username'
        )
        .eq(
          'id',
          requester.requester_id
        )
        .single();

      await supabase
        .from(
          'notifications'
        )
        .insert({
          user_id: null,

          message:
            `${currentUser.username} rejected ${name.username}'s date request.`,
        });

      alert(
        'You rejected the date request.'
      );

      fetchIncomingDateRequests();
    } catch (err) {
      console.error(
        'Error rejecting request:',
        err
      );
    }
  }

  // =====================================================
  // END DATE
  // =====================================================

  async function endDate() {
    if (!activeDate)
      return;

    try {
      const {
        data:
          datingRow,
        error:
          datingError,
      } = await supabase
        .from('dating')
        .select(
          'id, started_at, user1_id, user2_id'
        )
        .is(
          'ended_at',
          null
        )
        .or(
          `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
        )
        .single();

      if (
        datingError ||
        !datingRow
      ) {
        console.error(
          'Error fetching dating record:',
          datingError
        );

        alert(
          'Идэвхтэй болзоо олдсонгүй.'
        );

        return;
      }

      const startedAtUTC =
        Date.parse(
          datingRow.started_at
        );

      const nowUTC =
        Date.now();

      const diffMs =
        nowUTC -
        startedAtUTC;

      if (
        diffMs <
        6 *
          60 *
          60 *
          1000
      ) {
        const remainingMs =
          6 *
            60 *
            60 *
            1000 -
          diffMs;

        const remainingHours =
          Math.floor(
            remainingMs /
              (1000 *
                60 *
                60)
          );

        const remainingMinutes =
          Math.floor(
            (remainingMs %
              (1000 *
                60 *
                60)) /
              (1000 * 60)
          );

        alert(
          `Та багадаа 6 цаг болзох ёстой. ${remainingHours} цаг ${remainingMinutes} минутын дараа дахин үзнэ үү.`
        );

        return;
      }

      const {
        error:
          endDatingError,
      } = await supabase
        .from('dating')
        .update({
          ended_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          datingRow.id
        );

      if (
        endDatingError
      ) {
        throw endDatingError;
      }

      await supabase
        .from(
          'date_requests'
        )
        .update({
          status:
            'ended',
        })
        .eq(
          'status',
          'accepted'
        )
        .or(
          `requester_id.eq.${datingRow.user1_id},requested_id.eq.${datingRow.user2_id}`
        );

      const {
        error:
          coupleTaskDeleteError,
      } = await supabase
        .from('couple_task')
        .delete()
        .in(
          'assignee_id',
          [
            datingRow.user1_id,
            datingRow.user2_id,
          ]
        );

      if (
        coupleTaskDeleteError
      ) {
        console.error(
          'Error deleting couple tasks:',
          coupleTaskDeleteError
        );
      }

      const {
        data:
          requesterProfile,
      } = await supabase
        .from('profiles')
        .select(
          'username'
        )
        .eq(
          'id',
          datingRow.user1_id
        )
        .single();

      const {
        data:
          requestedProfile,
      } = await supabase
        .from('profiles')
        .select(
          'username'
        )
        .eq(
          'id',
          datingRow.user2_id
        )
        .single();

      await supabase
        .from(
          'notifications'
        )
        .insert({
          user_id: null,

          message:
            `💔 ${requesterProfile.username} ба ${requestedProfile.username} болзоогоо дуусгалаа.`,
        });

      alert(
        'Та болзоогоо дуусгалаа.'
      );

      setActiveDate(
        null
      );

      setDatingTask(null);

      fetchActiveDate();
      fetchIncomingDateRequests();
      fetchLeaderboard();
    } catch (err) {
      console.error(
        'Error ending date:',
        err
      );

      alert(
        'Болзоог дуусгах үед алдаа гарлаа.'
      );
    }
  }

  // =====================================================
  // PROFILE
  // =====================================================

  const handleViewProfile =
    (userId) => {
      navigate(
        `/profile-view/${userId}`
      );
    };

  // =====================================================
  // USER CARD
  // =====================================================

  function UserCard({
    user,
    rank,
    onLike,
    onAskDate,
    onViewProfile,
    currentUser,
    top3UserIds,
    onBan,
    onUnban,
    isBanned,
    isSelf,
    assignTask,
    showRank = true,
  }) {
    const [
      showTaskInput,
      setShowTaskInput,
    ] = useState(false);

    const [
      taskInput,
      setTaskInput,
    ] = useState('');

    const isTop3User =
      top3UserIds.includes(
        currentUser?.id
      );

    const isUserTop3Rank =
      showRank &&
      rank < 3;

    const currentUserCanManage =
      currentUser?.is_admin ||
      currentUser?.is_creator;

    return (
      <li
        style={{
          listStyle:
            'none',

          marginBottom:
            '20px',

          backgroundColor:
            user.is_creator
              ? '#f3e8ff'
              : isUserTop3Rank ||
                  user.is_admin
                ? '#fffae6'
                : 'transparent',

          borderRadius:
            '8px',

          padding:
            '10px',

          boxShadow:
            user.is_creator
              ? '0 0 10px rgba(128, 0, 255, 0.25)'
              : isUserTop3Rank ||
                  user.is_admin
                ? '0 0 10px rgba(255, 215, 0, 0.5)'
                : 'none',
        }}
      >
        <div
          style={{
            display:
              'flex',

            alignItems:
              'center',
          }}
        >
          {user.profile_pic ? (
            <img
              src={
                user.profile_pic
              }
              alt={
                `${
                  user.nickname ||
                  user.username ||
                  'User'
                }'s avatar`
              }
              style={{
                width:
                  '50px',

                height:
                  '50px',

                borderRadius:
                  '50%',

                marginRight:
                  '10px',

                objectFit:
                  'cover',
              }}
            />
          ) : (
            <div
              style={{
                width:
                  '50px',
                height:
                  '50px',
                borderRadius:
                  '50%',
                marginRight:
                  '10px',
                backgroundColor:
                  '#eee',
                display:
                  'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              👤
            </div>
          )}

          <div
            style={{
              flexGrow: 1,
            }}
          >
            {showRank && (
              <>
                <strong>
                  #{rank + 1}
                </strong>{' '}
              </>
            )}

            {user.nickname}

            {user.is_creator && (
              <>
                {' '}
                👑
              </>
            )}

            {user.is_admin &&
              !user.is_creator && (
                <>
                  {' '}
                  🛡️
                </>
              )}

            {!user.is_admin &&
              !user.is_creator && (
                <>
                  {' '}
                  |{' '}
                  {
                    user.christma_points
                  }
                  ✨
                </>
              )}

            <br />

            Хүйс:{' '}
            {user.gender}
          </div>

          <div>
            {!user.is_admin &&
              !user.is_creator &&
              !currentUser?.is_admin &&
              !currentUser?.is_creator && (
                <>
                  <button
                    onClick={() =>
                      onLike(
                        user.id
                      )
                    }
                  >
                    ❤ Like
                  </button>

                  {!askedUserIds.includes(
                    user.id
                  ) && (
                    <button
                      onClick={() =>
                        onAskDate(
                          user.id
                        )
                      }
                    >
                      💌 Болзоо
                    </button>
                  )}
                </>
              )}

            <button
              onClick={() =>
                onViewProfile(
                  user.id
                )
              }
            >
              👀 Profile үзэх
            </button>

            {currentUserCanManage &&
              !user.is_admin &&
              !user.is_creator && (
                <button
                  onClick={() =>
                    navigate(
                      `/admin-bonus/${user.id}`
                    )
                  }
                  style={{
                    color:
                      'black',
                  }}
                >
                  🎁 Бонус
                </button>
              )}

            {currentUserCanManage &&
              !user.is_creator &&
              currentUser?.id !== user.id && (
                <button
                  onClick={() =>
                    navigate(
                      `/warning/${user.id}`
                    )
                  }
                  style={{
                    color:
                      'black',
                    marginLeft:
                      '5px',
                  }}
                >
                  ⚠️ Анхааруулга
                </button>
              )}

            {isTop3User &&
              !isSelf &&
              !user.is_admin &&
              !user.is_creator &&
              (isBanned ? (
                <button
                  onClick={() =>
                    onUnban(
                      user.id
                    )
                  }
                  style={{
                    backgroundColor:
                      'green',

                    color:
                      'white',
                  }}
                >
                  ✅ Unban
                </button>
              ) : (
                <button
                  onClick={() =>
                    onBan(
                      user.id
                    )
                  }
                  style={{
                    backgroundColor:
                      'red',

                    color:
                      'white',
                  }}
                >
                  🚫 Ban
                </button>
              ))}

            {currentUserCanManage &&
              isBanned &&
              !user.is_admin &&
              !user.is_creator && (
                <button
                  onClick={() =>
                    onUnban(
                      user.id
                    )
                  }
                  style={{
                    backgroundColor:
                      'green',

                    color:
                      'white',
                  }}
                >
                  ✅ Unban
                </button>
              )}

            {isTop3User &&
              isBanned &&
              !user.is_admin &&
              !user.is_creator && (
                <>
                  <button
                    onClick={() =>
                      setShowTaskInput(
                        !showTaskInput
                      )
                    }
                    style={{
                      backgroundColor:
                        'orange',

                      color:
                        'white',
                    }}
                  >
                    📝 Даалгавар
                  </button>

                  {showTaskInput && (
                    <div>
                      <input
                        type="text"
                        placeholder="Даалгавараа оруулна уу"
                        value={
                          taskInput
                        }
                        onChange={(
                          e
                        ) =>
                          setTaskInput(
                            e.target.value
                          )
                        }
                      />

                      <button
                        onClick={() => {
                          assignTask(
                            user.id,
                            taskInput
                          );

                          setShowTaskInput(
                            false
                          );

                          setTaskInput(
                            ''
                          );
                        }}
                      >
                        Даалгавар
                        илгээх
                      </button>
                    </div>
                  )}
                </>
              )}

            <button
              onClick={() =>
                setActiveReportId(
                  user.id
                )
              }
            >
              🚩 Репорт
            </button>

            {activeReportId ===
              user.id && (
              <div
                style={{
                  marginTop:
                    '10px',
                }}
              >
                <input
                  type="text"
                  placeholder="Report reason"
                  value={
                    reportReasons[
                      user.id
                    ] || ''
                  }
                  onChange={(
                    e
                  ) =>
                    setReportReasons(
                      (prev) => ({
                        ...prev,

                        [user.id]:
                          e.target.value,
                      })
                    )
                  }
                  autoFocus
                  style={{
                    width:
                      '100%',

                    padding:
                      '8px',

                    border:
                      '1px solid #ccc',

                    borderRadius:
                      '4px',
                  }}
                />

                <br />

                <button
                  onClick={() =>
                    handleSubmitReport(
                      user.id
                    )
                  }
                  style={{
                    marginTop:
                      '5px',
                  }}
                >
                  Report Илгээх
                </button>
              </div>
            )}

            {currentUser?.is_creator &&
              !user.is_creator &&
              currentUser?.id !== user.id && (
                <button
                  onClick={() =>
                    navigate(
                      `/delete-user/${user.id}`
                    )
                  }
                  style={{
                    backgroundColor:
                      '#dc3545',
                    color:
                      'white',
                    border:
                      'none',
                    borderRadius:
                      '4px',
                    padding:
                      '4px 7px',
                    fontSize:
                      '12px',
                    cursor:
                      'pointer',
                  }}
                >
                  🗑️ Устгах
                </button>
              )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: 'auto',
        padding: 20,
      }}
    >
      <button
        onClick={() =>
          navigate(
            '/profile'
          )
        }
        style={{
          marginBottom: 20,
        }}
      >
        🔙 Profile руу буцах
      </button>

      <button
        onClick={() =>
          navigate(
            '/notifications'
          )
        }
        style={{
          marginBottom: 10,
        }}
      >
        📢 Бүх мэдэгдэлүүд
        (Public Notifications)
      </button>

      {currentUser?.is_creator && (
        <div
          style={{
            marginTop:
              '20px',

            marginBottom:
              '20px',

            padding:
              '12px',

            border:
              '2px solid #8a2be2',

            borderRadius:
              '8px',
          }}
        >
          <h3>
            👑 Creator Control
          </h3>

          <button
            onClick={() =>
              navigate(
                '/creator-reports'
              )
            }
          >
            🚨 Reports
          </button>

          <button
            onClick={() =>
              navigate(
                '/creator-dating-requests'
              )
            }
          >
            💌 Dating Requests
          </button>

          <button
            onClick={() =>
              navigate(
                '/creator-active-dating'
              )
            }
          >
            ❤️ Active Dating
          </button>

          <button
            onClick={() =>
              navigate(
                '/creator-tasks'
              )
            }
          >
            📋 Tasks
          </button>

          <button
            onClick={() =>
              navigate('/bans')
            }
          >
            🚫 Bans
          </button>
        </div>
      )}

      {activeDate && (
        <div
          style={{
            margin:
              '20px 0',

            textAlign:
              'center',
          }}
        >
          <button
            onClick={
              endDate
            }
            style={{
              padding:
                '10px 20px',

              backgroundColor:
                '#ff4d4f',

              color:
                '#fff',

              border:
                'none',

              borderRadius:
                '5px',
            }}
          >
            💔 Болзоог дуусгах
          </button>
        </div>
      )}

      {!activeDate &&
        myTask && (
          <div className="p-6 mb-6 bg-yellow-200 border-4 border-yellow-500 rounded-xl shadow-lg animate-pulse text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">
              🚨 Таньд
              даалгавар ирсэн
              байна! 🚨
            </h2>

            <h3 className="text-xl text-gray-800">
              Таны даалгавар:{' '}
              <u>
                {myTask}
              </u>
              !!!
            </h3>
          </div>
        )}

      {activeDate &&
        datingTask && (
          <div className="p-6 mb-6 bg-pink-100 border-4 border-pink-400 rounded-xl shadow-lg animate-pulse text-center">
            <h2 className="text-2xl font-bold text-pink-600 mb-2">
              💑 Хосын
              даалгавар! 💑
            </h2>

            <h3 className="text-2xl font-bold text-pink-600 mb-2">
              Ямар нэгэн юм
              болвол манай web
              асуудал хүлээхгүйг
              анхааруулья!
            </h3>

            <h3 className="text-xl text-gray-800">
              Та хоёрын
              хамтарсан
              даалгавар:{' '}
              <u>
                {datingTask}
              </u>
            </h3>
          </div>
        )}

      {incomingDateRequests.length >
        0 && (
        <div
          style={{
            marginTop: 30,
            padding: 15,

            border:
              '1px solid #ccc',

            borderRadius: 8,
          }}
        >
          <h3>
            📩 Чамд ирсэн
            болзох саналууд
          </h3>

          <ul
            style={{
              padding: 0,
            }}
          >
            {incomingDateRequests.map(
              (
                request
              ) => (
                <DateRequestCard
                  key={
                    request.id
                  }
                  request={
                    request
                  }
                  onAccept={
                    handleAccept
                  }
                  onReject={
                    handleReject
                  }
                />
              )
            )}
          </ul>
        </div>
      )}

      {loading && (
        <p>
          Loading...
        </p>
      )}

      {error && (
        <p
          style={{
            color: 'red',
          }}
        >
          Error:{' '}
          {error.message}
        </p>
      )}

      {!loading &&
        creatorUsers.length >
          0 && (
          <>
            <hr />

            <h3>
              👑 Creator Accounts
            </h3>

            {creatorUsers.map(
              (
                user,
                index
              ) => (
                <UserCard
                  key={
                    user.id
                  }
                  user={
                    user
                  }
                  rank={
                    index
                  }
                  showRank={
                    false
                  }
                  onLike={() => {}}
                  onAskDate={() => {}}
                  onViewProfile={
                    handleViewProfile
                  }
                  currentUser={
                    currentUser
                  }
                  top3UserIds={
                    top3UserIds
                  }
                  onBan={() => {}}
                  onUnban={
                    handleUnbanUser
                  }
                  isBanned={
                    bannedUserIds.has(
                      user.id
                    )
                  }
                  isSelf={
                    currentUser?.id ===
                    user.id
                  }
                  assignTask={() => {}}
                />
              )
            )}
          </>
        )}

      {!loading &&
        adminUsers.length >
          0 && (
          <>
            <hr />

            <h3>
              🛡️ Admin Accounts
            </h3>

            {adminUsers.map(
              (
                user,
                index
              ) => (
                <UserCard
                  key={
                    user.id
                  }
                  user={
                    user
                  }
                  rank={
                    index
                  }
                  showRank={
                    false
                  }
                  onLike={() => {}}
                  onAskDate={() => {}}
                  onViewProfile={
                    handleViewProfile
                  }
                  currentUser={
                    currentUser
                  }
                  top3UserIds={
                    top3UserIds
                  }
                  onBan={() => {}}
                  onUnban={
                    handleUnbanUser
                  }
                  isBanned={
                    bannedUserIds.has(
                      user.id
                    )
                  }
                  isSelf={
                    currentUser?.id ===
                    user.id
                  }
                  assignTask={() => {}}
                />
              )
            )}
          </>
        )}

      <hr />

      <h2>
        Ранк 🏆
      </h2>

      {!loading &&
        !error && (
          <>
            {users.map(
              (
                user,
                index
              ) => (
                <UserCard
                  key={
                    user.id
                  }
                  user={
                    user
                  }
                  rank={
                    index
                  }
                  showRank={
                    true
                  }
                  onLike={
                    onLike
                  }
                  onAskDate={
                    onAskDate
                  }
                  onViewProfile={
                    handleViewProfile
                  }
                  currentUser={
                    currentUser
                  }
                  top3UserIds={
                    top3UserIds
                  }
                  onBan={
                    handleBanUser
                  }
                  onUnban={
                    handleUnbanUser
                  }
                  isBanned={
                    bannedUserIds.has(
                      user.id
                    )
                  }
                  isSelf={
                    user.id ===
                      currentUser?.id ||
                    top3UserIds.includes(
                      user.id
                    )
                  }
                  assignTask={
                    assignTask
                  }
                />
              )
            )}
          </>
        )}

      <hr />

      <h3>
        Үүсгэн байгуулагч:
        Nazuke
      </h3>
    </div>
  );
}