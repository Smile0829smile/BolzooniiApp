import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationPage() {
  const navigate = useNavigate();

  // =====================================================
  // MAIN
  // =====================================================

  const [currentUser, setCurrentUser] = useState(null);

  // notifications | likes
  const [activeView, setActiveView] = useState('notifications');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  const [notifications, setNotifications] = useState([]);

  const [
    selectedNotificationIds,
    setSelectedNotificationIds,
  ] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editMessage, setEditMessage] = useState('');

  const [
    deletingNotifications,
    setDeletingNotifications,
  ] = useState(false);

  const [savingEdit, setSavingEdit] = useState(false);

  // =====================================================
  // LIKES
  // =====================================================

  const [likes, setLikes] = useState([]);
  const [profiles, setProfiles] = useState({});

  const [
    selectedLikeIds,
    setSelectedLikeIds,
  ] = useState([]);

  const [
    deletingLikes,
    setDeletingLikes,
  ] = useState(false);

  // =====================================================
  // LOAD CURRENT USER
  // =====================================================

  useEffect(() => {
    getCurrentUser();
  }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
    }
  }, [currentUser?.id]);

  // =====================================================
  // CURRENT USER
  // =====================================================

  async function getCurrentUser() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          'Хэрэглэгч нэвтрээгүй байна.'
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, is_admin, is_creator'
        )
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setCurrentUser(profile);
    } catch (err) {
      console.error(
        'Current user error:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // ROLE CHECKS
  // =====================================================

  const isCreator =
    currentUser?.is_creator === true;

  const isAdmin =
    currentUser?.is_admin === true;

  const canSeeEverything =
    isAdmin || isCreator;

  // =====================================================
  // SWITCH TO NOTIFICATIONS
  // =====================================================

  async function showNotifications() {
    setActiveView('notifications');
    setError(null);

    await fetchNotifications();
  }

  // =====================================================
  // SWITCH TO LIKES
  // =====================================================

  async function showLikes() {
    setActiveView('likes');
    setError(null);

    await fetchLikes();
  }

  // =====================================================
  // FETCH NOTIFICATIONS
  // Normal = newest 25
  // Admin/Creator = everything
  // =====================================================

  async function fetchNotifications() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('notifications')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (!canSeeEverything) {
        query = query.limit(25);
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      const rows =
        data || [];

      setNotifications(rows);

      setSelectedNotificationIds(
        (current) =>
          current.filter(
            (selectedId) =>
              rows.some(
                (note) =>
                  note.id === selectedId
              )
          )
      );
    } catch (err) {
      console.error(
        'Fetch notifications error:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // SELECT NOTIFICATION
  // =====================================================

  function handleSelectNotification(notificationId) {
    if (!isCreator) return;

    setSelectedNotificationIds(
      (current) => {
        if (
          current.includes(
            notificationId
          )
        ) {
          return current.filter(
            (id) =>
              id !== notificationId
          );
        }

        return [
          ...current,
          notificationId,
        ];
      }
    );
  }

  // =====================================================
  // SELECT ALL NOTIFICATIONS
  // =====================================================

  function handleSelectAllNotifications() {
    if (!isCreator) return;

    if (
      notifications.length === 0
    ) {
      return;
    }

    if (
      selectedNotificationIds.length ===
      notifications.length
    ) {
      setSelectedNotificationIds([]);
    } else {
      setSelectedNotificationIds(
        notifications.map(
          (note) =>
            note.id
        )
      );
    }
  }

  // =====================================================
  // DELETE ONE NOTIFICATION
  // =====================================================

  async function handleDeleteNotification(notificationId) {
    if (!isCreator) {
      return;
    }

    const confirmed =
      window.confirm(
        'Энэ мэдэгдлийг бүр мөсөн устгах уу?'
      );

    if (!confirmed) return;

    try {
      setDeletingNotifications(true);

      const {
        error,
      } = await supabase
        .from('notifications')
        .delete()
        .eq(
          'id',
          notificationId
        );

      if (error) {
        throw error;
      }

      await fetchNotifications();

      setSelectedNotificationIds(
        (current) =>
          current.filter(
            (id) =>
              id !== notificationId
          )
      );
    } catch (err) {
      console.error(
        'Delete notification error:',
        err
      );

      alert(
        `Мэдэгдэл устгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingNotifications(false);
    }
  }

  // =====================================================
  // DELETE SELECTED NOTIFICATIONS
  // =====================================================

  async function handleDeleteSelectedNotifications() {
    if (!isCreator) return;

    if (
      selectedNotificationIds.length ===
      0
    ) {
      alert(
        'Устгах мэдэгдлүүдээ сонгоно уу.'
      );

      return;
    }

    const count =
      selectedNotificationIds.length;

    const confirmed =
      window.confirm(
        `${count} мэдэгдлийг устгах уу?`
      );

    if (!confirmed) return;

    try {
      setDeletingNotifications(true);

      const {
        error,
      } = await supabase
        .from('notifications')
        .delete()
        .in(
          'id',
          selectedNotificationIds
        );

      if (error) {
        throw error;
      }

      setSelectedNotificationIds([]);

      await fetchNotifications();

      alert(
        `${count} мэдэгдэл устгагдлаа.`
      );
    } catch (err) {
      console.error(
        'Delete selected notifications error:',
        err
      );

      alert(
        `Мэдэгдэл устгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingNotifications(false);
    }
  }

  // =====================================================
  // KEEP NEWEST 25 NOTIFICATIONS
  // =====================================================

  async function handleDeleteAllExceptLast25() {
    if (!isCreator) return;

    if (
      notifications.length <= 25
    ) {
      alert(
        `Одоогоор ${notifications.length} мэдэгдэл байна.\n` +
          '25-аас илүү мэдэгдэл байхгүй.'
      );

      return;
    }

    const deleteCount =
      notifications.length - 25;

    const confirmed =
      window.confirm(
        `Хамгийн шинэ 25 мэдэгдлийг үлдээгээд ` +
          `${deleteCount} хуучин мэдэгдлийг устгах уу?`
      );

    if (!confirmed) return;

    try {
      setDeletingNotifications(true);

      const {
        data: deletedCount,
        error,
      } = await supabase.rpc(
        'creator_cleanup_notifications',
        {
          keep_count: 25,
        }
      );

      if (error) {
        throw error;
      }

      setSelectedNotificationIds([]);

      await fetchNotifications();

      alert(
        `${deletedCount || 0} хуучин мэдэгдэл устгагдлаа.`
      );
    } catch (err) {
      console.error(
        'Notification cleanup error:',
        err
      );

      alert(
        `Мэдэгдэл цэвэрлэхэд алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingNotifications(false);
    }
  }

  // =====================================================
  // START EDIT
  // =====================================================

  function handleStartEdit(note) {
    if (!isCreator) return;

    setEditingId(note.id);

    setEditMessage(
      note.message || ''
    );
  }

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  function handleCancelEdit() {
    setEditingId(null);
    setEditMessage('');
  }

  // =====================================================
  // SAVE EDIT
  // =====================================================

  async function handleSaveEdit(notificationId) {
    if (!isCreator) {
      return;
    }

    const trimmedMessage =
      editMessage.trim();

    if (!trimmedMessage) {
      alert(
        'Мэдэгдлийн текст хоосон байж болохгүй.'
      );

      return;
    }

    try {
      setSavingEdit(true);

      const {
        error,
      } = await supabase
        .from('notifications')
        .update({
          message:
            trimmedMessage,
        })
        .eq(
          'id',
          notificationId
        );

      if (error) {
        throw error;
      }

      setEditingId(null);
      setEditMessage('');

      await fetchNotifications();

      alert(
        'Мэдэгдэл шинэчлэгдлээ.'
      );
    } catch (err) {
      console.error(
        'Edit notification error:',
        err
      );

      alert(
        `Мэдэгдэл засахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // =====================================================
  // FETCH LIKES
  // Normal = newest 25
  // Admin/Creator = everything
  // =====================================================

  async function fetchLikes() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('likes')
        .select(
          'id, liker_id, liked_id, created_at, like_day'
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (!canSeeEverything) {
        query = query.limit(25);
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      const rows =
        data || [];

      setLikes(rows);

      // =================================================
      // GET USER PROFILES
      // =================================================

      const userIds = [
        ...new Set(
          rows.flatMap(
            (like) => [
              like.liker_id,
              like.liked_id,
            ]
          )
        ),
      ].filter(Boolean);

      if (
        userIds.length === 0
      ) {
        setProfiles({});
        setSelectedLikeIds([]);
        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, profile_pic'
        )
        .in(
          'id',
          userIds
        );

      if (profileError) {
        throw profileError;
      }

      const profileMap = {};

      (profileData || []).forEach(
        (profile) => {
          profileMap[
            profile.id
          ] = profile;
        }
      );

      setProfiles(
        profileMap
      );

      setSelectedLikeIds(
        (current) =>
          current.filter(
            (selectedId) =>
              rows.some(
                (like) =>
                  like.id === selectedId
              )
          )
      );
    } catch (err) {
      console.error(
        'Fetch Likes error:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // PROFILE NAME
  // =====================================================

  function getProfileName(userId) {
    const profile =
      profiles[userId];

    if (!profile) {
      return 'Unknown User';
    }

    return (
      profile.nickname ||
      profile.username ||
      'Unknown User'
    );
  }

  // =====================================================
  // SELECT LIKE
  // =====================================================

  function handleSelectLike(likeId) {
    if (!isCreator) return;

    setSelectedLikeIds(
      (current) => {
        if (
          current.includes(
            likeId
          )
        ) {
          return current.filter(
            (id) =>
              id !== likeId
          );
        }

        return [
          ...current,
          likeId,
        ];
      }
    );
  }

  // =====================================================
  // SELECT ALL LIKES
  // =====================================================

  function handleSelectAllLikes() {
    if (!isCreator) return;

    if (
      likes.length === 0
    ) {
      return;
    }

    if (
      selectedLikeIds.length ===
      likes.length
    ) {
      setSelectedLikeIds([]);
    } else {
      setSelectedLikeIds(
        likes.map(
          (like) =>
            like.id
        )
      );
    }
  }

  // =====================================================
  // DELETE ONE LIKE
  // =====================================================

  async function handleDeleteLike(likeId) {
    if (!isCreator) {
      return;
    }

    const confirmed =
      window.confirm(
        'Энэ Like түүхийг бүр мөсөн устгах уу?'
      );

    if (!confirmed) return;

    try {
      setDeletingLikes(true);

      const {
        error,
      } = await supabase
        .from('likes')
        .delete()
        .eq(
          'id',
          likeId
        );

      if (error) {
        throw error;
      }

      setSelectedLikeIds(
        (current) =>
          current.filter(
            (id) =>
              id !== likeId
          )
      );

      await fetchLikes();

      alert(
        'Like устгагдлаа.'
      );
    } catch (err) {
      console.error(
        'Delete Like error:',
        err
      );

      alert(
        `Like устгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingLikes(false);
    }
  }

  // =====================================================
  // DELETE SELECTED LIKES
  // =====================================================

  async function handleDeleteSelectedLikes() {
    if (!isCreator) {
      return;
    }

    if (
      selectedLikeIds.length ===
      0
    ) {
      alert(
        'Устгах Likes-аа сонгоно уу.'
      );

      return;
    }

    const count =
      selectedLikeIds.length;

    const confirmed =
      window.confirm(
        `${count} Like түүхийг устгах уу?`
      );

    if (!confirmed) return;

    try {
      setDeletingLikes(true);

      const {
        error,
      } = await supabase
        .from('likes')
        .delete()
        .in(
          'id',
          selectedLikeIds
        );

      if (error) {
        throw error;
      }

      setSelectedLikeIds([]);

      await fetchLikes();

      alert(
        `${count} Like устгагдлаа.`
      );
    } catch (err) {
      console.error(
        'Delete selected Likes error:',
        err
      );

      alert(
        `Likes устгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingLikes(false);
    }
  }

  // =====================================================
  // KEEP NEWEST 25 LIKES
  // Creator only
  // =====================================================

  async function handleDeleteLikesExceptLast25() {
    if (!isCreator) {
      return;
    }

    if (
      likes.length <= 25
    ) {
      alert(
        `Одоогоор ${likes.length} Like байна.\n` +
          '25-аас илүү Like байхгүй.'
      );

      return;
    }

    const oldLikes =
      likes.slice(25);

    const oldLikeIds =
      oldLikes.map(
        (like) =>
          like.id
      );

    const confirmed =
      window.confirm(
        `Хамгийн шинэ 25 Likes-ийг үлдээгээд ` +
          `${oldLikeIds.length} хуучин Like түүхийг устгах уу?`
      );

    if (!confirmed) return;

    try {
      setDeletingLikes(true);

      const {
        error,
      } = await supabase
        .from('likes')
        .delete()
        .in(
          'id',
          oldLikeIds
        );

      if (error) {
        throw error;
      }

      setSelectedLikeIds([]);

      await fetchLikes();

      alert(
        `${oldLikeIds.length} хуучин Like устгагдлаа.\n` +
          'Хамгийн шинэ 25 Likes үлдлээ.'
      );
    } catch (err) {
      console.error(
        'Likes cleanup error:',
        err
      );

      alert(
        `Likes цэвэрлэхэд алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingLikes(false);
    }
  }

  // =====================================================
  // FORMAT TIME
  // =====================================================

  function formatTime(createdAt) {
    if (!createdAt) {
      return 'Цаг тодорхойгүй';
    }

    try {
      return formatDistanceToNow(
        new Date(createdAt),
        {
          addSuffix: true,
        }
      );
    } catch {
      return createdAt;
    }
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: 'auto',
        padding: '20px',
      }}
    >
      {/* =================================================
          BACK
      ================================================= */}

      <button
        onClick={() =>
          navigate(
            '/leaderboard'
          )
        }
        style={{
          marginBottom:
            '20px',

          padding:
            '8px 12px',

          borderRadius:
            '5px',

          cursor:
            'pointer',
        }}
      >
        🔙 Leaderboard руу буцах
      </button>

      {/* =================================================
          TWO OPTIONS
      ================================================= */}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '25px',
        }}
      >
        {/* EVERY HISTORY */}

        <button
          onClick={
            showNotifications
          }
          style={{
            flex: 1,

            padding:
              '12px',

            border:
              activeView ===
              'notifications'
                ? '2px solid #6f42c1'
                : '1px solid #ccc',

            borderRadius:
              '8px',

            backgroundColor:
              activeView ===
              'notifications'
                ? '#6f42c1'
                : 'white',

            color:
              activeView ===
              'notifications'
                ? 'white'
                : 'black',

            fontWeight:
              'bold',

            cursor:
              'pointer',
          }}
        >
          📚 Бүх түүх
        </button>

        {/* LIKES */}

        <button
          onClick={
            showLikes
          }
          style={{
            flex: 1,

            padding:
              '12px',

            border:
              activeView ===
              'likes'
                ? '2px solid #ff4d6d'
                : '1px solid #ccc',

            borderRadius:
              '8px',

            backgroundColor:
              activeView ===
              'likes'
                ? '#ff4d6d'
                : 'white',

            color:
              activeView ===
              'likes'
                ? 'white'
                : 'black',

            fontWeight:
              'bold',

            cursor:
              'pointer',
          }}
        >
          ❤️ Likes
        </button>
      </div>

      {/* =================================================
          ROLE INFO
      ================================================= */}

      {!canSeeEverything && (
        <div
          style={{
            padding:
              '8px 10px',

            marginBottom:
              '15px',

            backgroundColor:
              '#f8f9fa',

            borderRadius:
              '5px',

            color:
              '#777',

            fontSize:
              '13px',
          }}
        >
          Хамгийн сүүлийн 25 түүхийг харуулж байна.
        </div>
      )}

      {isAdmin &&
        !isCreator && (
          <div
            style={{
              padding:
                '8px 10px',

              marginBottom:
                '15px',

              backgroundColor:
                '#e0f0ff',

              borderRadius:
                '5px',

              color:
                '#0056b3',

              fontSize:
                '13px',
            }}
          >
            🛡️ Admin: Бүх түүхийг харах эрхтэй.
          </div>
        )}

      {isCreator && (
        <div
          style={{
            padding:
              '8px 10px',

            marginBottom:
              '15px',

            backgroundColor:
              '#f8f2ff',

            borderRadius:
              '5px',

            color:
              '#6f42c1',

            fontSize:
              '13px',
          }}
        >
          👑 Creator: Бүх түүхийг харах, засах, устгах эрхтэй.
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          style={{
            padding:
              '10px',

            marginBottom:
              '15px',

            color:
              '#721c24',

            backgroundColor:
              '#f8d7da',

            borderRadius:
              '5px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* =================================================
          NOTIFICATIONS VIEW
      ================================================= */}

      {activeView ===
        'notifications' && (
        <>
          <h2>
            📢 Мэдэгдлүүд
          </h2>

          {/* CREATOR CONTROLS */}

          {isCreator && (
            <div
              style={{
                marginBottom:
                  '20px',

                padding:
                  '15px',

                border:
                  '2px solid #8a2be2',

                borderRadius:
                  '10px',

                backgroundColor:
                  '#f8f2ff',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                👑 Creator удирдлага
              </h3>

              <p>
                Нийт мэдэгдэл:{' '}
                <strong>
                  {
                    notifications.length
                  }
                </strong>
              </p>

              <p>
                Сонгосон:{' '}
                <strong>
                  {
                    selectedNotificationIds.length
                  }
                </strong>
              </p>

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '10px',

                  flexWrap:
                    'wrap',
                }}
              >
                <button
                  onClick={
                    handleSelectAllNotifications
                  }
                  disabled={
                    deletingNotifications ||
                    notifications.length ===
                      0
                  }
                >
                  {selectedNotificationIds.length ===
                    notifications.length &&
                  notifications.length >
                    0
                    ? '☐ Бүгдийг болиулах'
                    : '☑️ Бүгдийг сонгох'}
                </button>

                <button
                  onClick={
                    handleDeleteSelectedNotifications
                  }
                  disabled={
                    deletingNotifications ||
                    selectedNotificationIds.length ===
                      0
                  }
                  style={{
                    backgroundColor:
                      '#dc3545',

                    color:
                      'white',

                    border:
                      'none',

                    borderRadius:
                      '5px',

                    padding:
                      '8px 12px',
                  }}
                >
                  🗑️ Сонгосон{' '}
                  {
                    selectedNotificationIds.length
                  }
                  -г устгах
                </button>

                <button
                  onClick={
                    handleDeleteAllExceptLast25
                  }
                  disabled={
                    deletingNotifications ||
                    notifications.length <=
                      25
                  }
                  style={{
                    backgroundColor:
                      '#fd7e14',

                    color:
                      'white',

                    border:
                      'none',

                    borderRadius:
                      '5px',

                    padding:
                      '8px 12px',
                  }}
                >
                  🧹 Хамгийн шинэ 25-г үлдээх
                </button>

                <button
                  onClick={
                    fetchNotifications
                  }
                  disabled={
                    deletingNotifications
                  }
                >
                  🔄 Шинэчлэх
                </button>
              </div>
            </div>
          )}

          {loading && (
            <p>
              Уншиж байна...
            </p>
          )}

          {!loading &&
            notifications.length ===
              0 && (
              <p>
                Мэдэгдэл байхгүй байна.
              </p>
            )}

          {!loading &&
            notifications.map(
              (note) => {
                const selected =
                  selectedNotificationIds.includes(
                    note.id
                  );

                const isEditing =
                  editingId ===
                  note.id;

                return (
                  <div
                    key={
                      note.id
                    }
                    style={{
                      padding:
                        '12px',

                      marginBottom:
                        '12px',

                      border:
                        selected
                          ? '2px solid #8a2be2'
                          : '1px solid #ddd',

                      borderRadius:
                        '8px',

                      backgroundColor:
                        selected
                          ? '#f8f2ff'
                          : 'white',
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',

                        gap:
                          '10px',

                        alignItems:
                          'flex-start',
                      }}
                    >
                      {isCreator && (
                        <input
                          type="checkbox"
                          checked={
                            selected
                          }
                          onChange={() =>
                            handleSelectNotification(
                              note.id
                            )
                          }
                        />
                      )}

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        {isEditing ? (
                          <>
                            <textarea
                              value={
                                editMessage
                              }
                              onChange={(
                                e
                              ) =>
                                setEditMessage(
                                  e.target.value
                                )
                              }
                              rows={4}
                              style={{
                                width:
                                  '100%',

                                boxSizing:
                                  'border-box',

                                padding:
                                  '8px',
                              }}
                            />

                            <div
                              style={{
                                display:
                                  'flex',

                                gap:
                                  '8px',

                                marginTop:
                                  '8px',
                              }}
                            >
                              <button
                                onClick={() =>
                                  handleSaveEdit(
                                    note.id
                                  )
                                }
                                disabled={
                                  savingEdit
                                }
                              >
                                💾 Хадгалах
                              </button>

                              <button
                                onClick={
                                  handleCancelEdit
                                }
                              >
                                ❌ Болих
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <strong>
                              {
                                note.message
                              }
                            </strong>

                            <br />

                            <small>
                              {formatTime(
                                note.created_at
                              )}
                            </small>
                          </>
                        )}
                      </div>
                    </div>

                    {isCreator &&
                      !isEditing && (
                        <div
                          style={{
                            display:
                              'flex',

                            gap:
                              '8px',

                            marginTop:
                              '10px',
                          }}
                        >
                          <button
                            onClick={() =>
                              handleStartEdit(
                                note
                              )
                            }
                          >
                            ✏️ Засах
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteNotification(
                                note.id
                              )
                            }
                            disabled={
                              deletingNotifications
                            }
                            style={{
                              backgroundColor:
                                '#dc3545',

                              color:
                                'white',

                              border:
                                'none',

                              padding:
                                '6px 10px',

                              borderRadius:
                                '5px',
                            }}
                          >
                            🗑️ Устгах
                          </button>
                        </div>
                      )}
                  </div>
                );
              }
            )}
        </>
      )}

      {/* =================================================
          LIKES VIEW
      ================================================= */}

      {activeView ===
        'likes' && (
        <>
          <h2>
            ❤️ Likes түүх
          </h2>

          <p>
            {canSeeEverything
              ? 'Нийт харагдаж байгаа Likes:'
              : 'Хамгийн сүүлийн Likes:'}{' '}
            <strong>
              {likes.length}
            </strong>
          </p>

          {/* CREATOR LIKES CONTROLS */}

          {isCreator && (
            <div
              style={{
                padding:
                  '15px',

                marginBottom:
                  '20px',

                border:
                  '2px solid #8a2be2',

                borderRadius:
                  '8px',

                backgroundColor:
                  '#f8f2ff',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                👑 Creator удирдлага
              </h3>

              <p>
                Нийт Likes:{' '}
                <strong>
                  {likes.length}
                </strong>
              </p>

              <p>
                Сонгосон:{' '}
                <strong>
                  {
                    selectedLikeIds.length
                  }
                </strong>
              </p>

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '10px',

                  flexWrap:
                    'wrap',
                }}
              >
                <button
                  onClick={
                    handleSelectAllLikes
                  }
                  disabled={
                    deletingLikes ||
                    likes.length ===
                      0
                  }
                >
                  {selectedLikeIds.length ===
                    likes.length &&
                  likes.length >
                    0
                    ? '☐ Бүгдийг болиулах'
                    : '☑️ Бүгдийг сонгох'}
                </button>

                <button
                  onClick={
                    handleDeleteSelectedLikes
                  }
                  disabled={
                    deletingLikes ||
                    selectedLikeIds.length ===
                      0
                  }
                  style={{
                    padding:
                      '8px 12px',

                    backgroundColor:
                      '#dc3545',

                    color:
                      'white',

                    border:
                      'none',

                    borderRadius:
                      '5px',
                  }}
                >
                  {deletingLikes
                    ? 'Устгаж байна...'
                    : `🗑️ Сонгосон Likes (${selectedLikeIds.length})`}
                </button>

                <button
                  onClick={
                    handleDeleteLikesExceptLast25
                  }
                  disabled={
                    deletingLikes ||
                    likes.length <=
                      25
                  }
                  style={{
                    padding:
                      '8px 12px',

                    backgroundColor:
                      '#fd7e14',

                    color:
                      'white',

                    border:
                      'none',

                    borderRadius:
                      '5px',

                    opacity:
                      likes.length <=
                      25
                        ? 0.5
                        : 1,
                  }}
                >
                  🧹 Хамгийн шинэ 25 Likes-г үлдээх
                </button>

                <button
                  onClick={
                    fetchLikes
                  }
                  disabled={
                    deletingLikes
                  }
                >
                  🔄 Шинэчлэх
                </button>
              </div>
            </div>
          )}

          {loading && (
            <p>
              Likes уншиж байна...
            </p>
          )}

          {!loading &&
            likes.length ===
              0 && (
              <p>
                Likes түүх байхгүй байна.
              </p>
            )}

          {!loading &&
            likes.map(
              (like) => {
                const liker =
                  profiles[
                    like.liker_id
                  ];

                const selected =
                  selectedLikeIds.includes(
                    like.id
                  );

                return (
                  <div
                    key={
                      like.id
                    }
                    style={{
                      display:
                        'flex',

                      alignItems:
                        'center',

                      gap:
                        '12px',

                      padding:
                        '12px',

                      marginBottom:
                        '12px',

                      border:
                        selected
                          ? '2px solid #8a2be2'
                          : '1px solid #ddd',

                      borderRadius:
                        '8px',

                      backgroundColor:
                        selected
                          ? '#f8f2ff'
                          : 'white',
                    }}
                  >
                    {/* SELECT */}

                    {isCreator && (
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        onChange={() =>
                          handleSelectLike(
                            like.id
                          )
                        }
                        disabled={
                          deletingLikes
                        }
                      />
                    )}

                    {/* LIKER PROFILE PICTURE */}

                    {liker?.profile_pic ? (
                      <img
                        src={
                          liker.profile_pic
                        }
                        alt="Liker"
                        onClick={() =>
                          navigate(
                            `/profile-view/${like.liker_id}`
                          )
                        }
                        style={{
                          width:
                            '50px',

                          height:
                            '50px',

                          borderRadius:
                            '50%',

                          objectFit:
                            'cover',

                          cursor:
                            'pointer',

                          flexShrink: 0,
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

                          backgroundColor:
                            '#eee',

                          display:
                            'flex',

                          alignItems:
                            'center',

                          justifyContent:
                            'center',

                          flexShrink: 0,
                        }}
                      >
                        👤
                      </div>
                    )}

                    {/* LIKE INFO */}

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <span
                        onClick={() =>
                          navigate(
                            `/profile-view/${like.liker_id}`
                          )
                        }
                        style={{
                          fontWeight:
                            'bold',

                          cursor:
                            'pointer',
                        }}
                      >
                        {getProfileName(
                          like.liker_id
                        )}
                      </span>

                      {' нь '}

                      <span
                        onClick={() =>
                          navigate(
                            `/profile-view/${like.liked_id}`
                          )
                        }
                        style={{
                          fontWeight:
                            'bold',

                          cursor:
                            'pointer',
                        }}
                      >
                        {getProfileName(
                          like.liked_id
                        )}
                      </span>

                      {'-д Like өглөө ❤️'}

                      <br />

                      <small
                        style={{
                          color:
                            '#777',
                        }}
                      >
                        {formatTime(
                          like.created_at
                        )}
                      </small>

                      {like.like_day && (
                        <>
                          <br />

                          <small
                            style={{
                              color:
                                '#999',
                            }}
                          >
                            Like өдөр:{' '}
                            {
                              like.like_day
                            }
                          </small>
                        </>
                      )}
                    </div>

                    {/* DELETE ONE */}

                    {isCreator && (
                      <button
                        onClick={() =>
                          handleDeleteLike(
                            like.id
                          )
                        }
                        disabled={
                          deletingLikes
                        }
                        style={{
                          backgroundColor:
                            '#dc3545',

                          color:
                            'white',

                          border:
                            'none',

                          borderRadius:
                            '5px',

                          padding:
                            '7px 10px',
                        }}
                      >
                        🗑️ Устгах
                      </button>
                    )}
                  </div>
                );
              }
            )}
        </>
      )}
    </div>
  );
}