import { useEffect, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function DateHistory() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [
    targetProfile,
    setTargetProfile,
  ] = useState(null);

  const [
    currentDating,
    setCurrentDating,
  ] = useState(null);

  const [
    history,
    setHistory,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    isCreator,
    setIsCreator,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState(null);

  const [
    editStartedAt,
    setEditStartedAt,
  ] = useState('');

  const [
    editEndedAt,
    setEditEndedAt,
  ] = useState('');

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  // =====================================================
  // LOAD
  // =====================================================

  useEffect(() => {
    loadHistory();
  }, [userId]);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      // =================================================
      // LOGGED-IN USER / CREATOR CHECK
      // =================================================

      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (user) {
        const {
          data: me,
          error: meError,
        } = await supabase
          .from('profiles')
          .select(
            'id, is_creator'
          )
          .eq(
            'id',
            user.id
          )
          .single();

        if (meError) {
          throw meError;
        }

        setIsCreator(
          me?.is_creator === true
        );
      }

      // =================================================
      // PROFILE WHOSE HISTORY IS BEING VIEWED
      // =================================================

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          `
          id,
          username,
          nickname,
          profile_pic
          `
        )
        .eq(
          'id',
          userId
        )
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error(
          'Profile олдсонгүй.'
        );
      }

      setTargetProfile(
        profileData
      );

      // =================================================
      // GET ALL RELEVANT DATING ROWS
      // =================================================

      const sevenDaysAgo =
        new Date(
          Date.now() -
            7 *
              24 *
              60 *
              60 *
              1000
        ).toISOString();

      const {
        data: datingRows,
        error: datingError,
      } = await supabase
        .from('dating')
        .select(
          `
          id,
          user1_id,
          user2_id,
          started_at,
          ended_at
          `
        )
        .or(
          `user1_id.eq.${userId},user2_id.eq.${userId}`
        )
        .order(
          'started_at',
          {
            ascending: false,
          }
        );

      if (datingError) {
        throw datingError;
      }

      // =================================================
      // ACTIVE + LAST 7 DAYS ONLY
      // =================================================

      const relevantRows =
        (datingRows || []).filter(
          (row) => {
            // Current active date
            if (!row.ended_at) {
              return true;
            }

            // Finished within last 7 days
            return (
              new Date(
                row.ended_at
              ).getTime() >=
              new Date(
                sevenDaysAgo
              ).getTime()
            );
          }
        );

      if (
        relevantRows.length === 0
      ) {
        setCurrentDating(null);
        setHistory([]);
        return;
      }

      // =================================================
      // OTHER USER IDS
      // =================================================

      const otherUserIds = [
        ...new Set(
          relevantRows.map(
            (row) =>
              row.user1_id ===
              userId
                ? row.user2_id
                : row.user1_id
          )
        ),
      ].filter(Boolean);

      // =================================================
      // FETCH THEIR PROFILES
      // =================================================

      let profiles = [];

      if (
        otherUserIds.length >
        0
      ) {
        const {
          data: profileRows,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select(
            `
            id,
            username,
            nickname,
            profile_pic
            `
          )
          .in(
            'id',
            otherUserIds
          );

        if (profilesError) {
          throw profilesError;
        }

        profiles =
          profileRows || [];
      }

      const profileMap = {};

      profiles.forEach(
        (profile) => {
          profileMap[
            profile.id
          ] = profile;
        }
      );

      // =================================================
      // FORMAT
      // =================================================

      const formatted =
        relevantRows.map(
          (row) => {
            const otherUserId =
              row.user1_id ===
              userId
                ? row.user2_id
                : row.user1_id;

            return {
              ...row,

              otherUserId,

              otherUser:
                profileMap[
                  otherUserId
                ] || null,
            };
          }
        );

      // =================================================
      // CURRENT DATE
      // =================================================

      const active =
        formatted.find(
          (row) =>
            !row.ended_at
        ) || null;

      setCurrentDating(
        active
      );

      // =================================================
      // ENDED HISTORY
      // =================================================

      const ended =
        formatted
          .filter(
            (row) =>
              !!row.ended_at
          )
          .sort(
            (a, b) =>
              new Date(
                b.ended_at
              ) -
              new Date(
                a.ended_at
              )
          );

      setHistory(
        ended
      );
    } catch (err) {
      console.error(
        'Date history error:',
        err
      );

      setError(
        err.message
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(
    value
  ) {
    if (!value) {
      return 'Тодорхойгүй';
    }

    try {
      return new Date(
        value
      ).toLocaleString();
    } catch {
      return value;
    }
  }

  // =====================================================
  // DURATION
  // =====================================================

  function getDuration(
    startedAt,
    endedAt
  ) {
    if (!startedAt) {
      return 'Тодорхойгүй';
    }

    const start =
      new Date(
        startedAt
      ).getTime();

    const end =
      endedAt
        ? new Date(
            endedAt
          ).getTime()
        : Date.now();

    const difference =
      end - start;

    if (
      difference <= 0
    ) {
      return 'Тодорхойгүй';
    }

    const days =
      Math.floor(
        difference /
          (
            1000 *
            60 *
            60 *
            24
          )
      );

    const hours =
      Math.floor(
        (
          difference %
          (
            1000 *
            60 *
            60 *
            24
          )
        ) /
          (
            1000 *
            60 *
            60
          )
      );

    const minutes =
      Math.floor(
        (
          difference %
          (
            1000 *
            60 *
            60
          )
        ) /
          (
            1000 *
            60
          )
      );

    if (
      days > 0
    ) {
      return `${days} өдөр ${hours} цаг`;
    }

    if (
      hours > 0
    ) {
      return `${hours} цаг ${minutes} минут`;
    }

    return `${minutes} минут`;
  }

  // =====================================================
  // DATETIME INPUT FORMAT
  // =====================================================

  function toDateTimeInput(
    value
  ) {
    if (!value) {
      return '';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    const offset =
      date.getTimezoneOffset();

    const localDate =
      new Date(
        date.getTime() -
          offset *
            60 *
            1000
      );

    return localDate
      .toISOString()
      .slice(0, 16);
  }

  // =====================================================
  // START EDIT
  // =====================================================

  function startEdit(
    item
  ) {
    if (!isCreator) {
      return;
    }

    setEditingId(
      item.id
    );

    setEditStartedAt(
      toDateTimeInput(
        item.started_at
      )
    );

    setEditEndedAt(
      toDateTimeInput(
        item.ended_at
      )
    );
  }

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  function cancelEdit() {
    setEditingId(null);
    setEditStartedAt('');
    setEditEndedAt('');
  }

  // =====================================================
  // SAVE CREATOR EDIT
  // =====================================================

  async function saveEdit(
    item
  ) {
    if (!isCreator) {
      alert(
        'Зөвхөн Creator засах боломжтой.'
      );

      return;
    }

    if (!editStartedAt) {
      alert(
        'Эхэлсэн цаг хоосон байж болохгүй.'
      );

      return;
    }

    if (!editEndedAt) {
      alert(
        'Дууссан цаг хоосон байж болохгүй.'
      );

      return;
    }

    const started =
      new Date(
        editStartedAt
      );

    const ended =
      new Date(
        editEndedAt
      );

    if (
      Number.isNaN(
        started.getTime()
      ) ||
      Number.isNaN(
        ended.getTime()
      )
    ) {
      alert(
        'Огноо буруу байна.'
      );

      return;
    }

    if (
      ended <= started
    ) {
      alert(
        'Болзоо дууссан цаг нь эхэлсэн цагаасаа хойш байх ёстой.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        'Энэ болзооны түүхийн хугацааг засах уу?'
      );

    if (!confirmed) {
      return;
    }

    try {
      setSavingEdit(
        true
      );

      const {
        error: updateError,
      } = await supabase
        .from('dating')
        .update({
          started_at:
            started.toISOString(),

          ended_at:
            ended.toISOString(),
        })
        .eq(
          'id',
          item.id
        );

      if (updateError) {
        throw updateError;
      }

      alert(
        'Болзооны түүх амжилттай засагдлаа.'
      );

      cancelEdit();

      await loadHistory();
    } catch (err) {
      console.error(
        'Date history edit error:',
        err
      );

      alert(
        `Засахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setSavingEdit(
        false
      );
    }
  }

  // =====================================================
  // PERSON CARD
  // =====================================================

  function PersonHeader({
    item,
  }) {
    const person =
      item.otherUser;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {person?.profile_pic ? (
          <img
            src={
              person.profile_pic
            }
            alt={
              person.username ||
              'Profile'
            }
            onClick={() =>
              navigate(
                `/profile-view/${item.otherUserId}`
              )
            }
            style={{
              width: '65px',
              height: '65px',
              borderRadius: '50%',
              objectFit: 'cover',
              cursor: 'pointer',
            }}
          />
        ) : (
          <div
            style={{
              width: '65px',
              height: '65px',
              borderRadius: '50%',
              backgroundColor: '#eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
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
          <h3
            style={{
              margin: 0,
            }}
          >
            {person?.nickname ||
              person?.username ||
              'Unknown User'}
          </h3>

          {person?.username && (
            <small>
              @{person.username}
            </small>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          maxWidth: '650px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <p>
          Болзооны түүх ачаалж байна...
        </p>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div
        style={{
          maxWidth: '650px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <button
          onClick={() =>
            navigate(-1)
          }
        >
          🔙 Буцах
        </button>

        <p
          style={{
            color: 'red',
          }}
        >
          ❌ {error}
        </p>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      style={{
        maxWidth: '650px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      <button
        onClick={() =>
          navigate(-1)
        }
        style={{
          padding: '8px 12px',
          marginBottom: '20px',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        🔙 Буцах
      </button>

      <h1>
        💕 Болзооны түүх
      </h1>

      <h2>
        {targetProfile?.nickname ||
          targetProfile?.username}
      </h2>

      <p
        style={{
          color: '#666',
        }}
      >
        Одоогийн болзоо болон сүүлийн 7 хоногийн дууссан болзоонууд.
      </p>

      {/* =================================================
          CURRENT ACTIVE DATE
      ================================================= */}

      {currentDating && (
        <>
          <h3
            style={{
              marginTop: '30px',
            }}
          >
            ❤️ Одоогийн болзоо
          </h3>

          <div
            style={{
              padding: '16px',
              border: '2px solid #ff69b4',
              borderRadius: '12px',
              backgroundColor: '#fff0f6',
            }}
          >
            <PersonHeader
              item={
                currentDating
              }
            />

            <hr />

            <p>
              <strong>
                ❤️ Статус:
              </strong>{' '}
              Одоо болзож байна
            </p>

            <p>
              <strong>
                💗 Эхэлсэн:
              </strong>{' '}
              {formatDate(
                currentDating.started_at
              )}
            </p>

            <p>
              <strong>
                ⏱️ Одоогийн хугацаа:
              </strong>{' '}
              {getDuration(
                currentDating.started_at,
                null
              )}
            </p>

            <button
              onClick={() =>
                navigate(
                  `/profile-view/${currentDating.otherUserId}`
                )
              }
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#ff69b4',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              👤 Profile үзэх
            </button>
          </div>
        </>
      )}

      {/* =================================================
          OLD HISTORY
      ================================================= */}

      <h3
        style={{
          marginTop: '30px',
        }}
      >
        🕘 Сүүлийн 7 хоног
      </h3>

      {history.length ===
      0 ? (
        <div
          style={{
            marginTop: '15px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '10px',
            textAlign: 'center',
          }}
        >
          Сүүлийн 7 хоногт дууссан болзоо байхгүй байна.
        </div>
      ) : (
        history.map(
          (item) => (
            <div
              key={
                item.id
              }
              style={{
                marginTop: '15px',
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '12px',
              }}
            >
              <PersonHeader
                item={item}
              />

              <hr />

              {editingId ===
              item.id ? (
                <>
                  <label>
                    <strong>
                      💗 Эхэлсэн цаг
                    </strong>
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      editStartedAt
                    }
                    onChange={(e) =>
                      setEditStartedAt(
                        e.target.value
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '5px',
                      marginBottom: '12px',
                      boxSizing: 'border-box',
                    }}
                  />

                  <label>
                    <strong>
                      💔 Дууссан цаг
                    </strong>
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      editEndedAt
                    }
                    onChange={(e) =>
                      setEditEndedAt(
                        e.target.value
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '5px',
                      marginBottom: '12px',
                      boxSizing: 'border-box',
                    }}
                  />

                  <button
                    onClick={() =>
                      saveEdit(
                        item
                      )
                    }
                    disabled={
                      savingEdit
                    }
                    style={{
                      padding: '8px 12px',
                      marginRight: '8px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: savingEdit
                        ? 'not-allowed'
                        : 'pointer',
                    }}
                  >
                    {savingEdit
                      ? 'Хадгалж байна...'
                      : '💾 Хадгалах'}
                  </button>

                  <button
                    onClick={
                      cancelEdit
                    }
                    disabled={
                      savingEdit
                    }
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ Болих
                  </button>
                </>
              ) : (
                <>
                  <p>
                    <strong>
                      💗 Болзоо эхэлсэн:
                    </strong>{' '}
                    {formatDate(
                      item.started_at
                    )}
                  </p>

                  <p>
                    <strong>
                      💔 Болзоо дууссан:
                    </strong>{' '}
                    {formatDate(
                      item.ended_at
                    )}
                  </p>

                  <p>
                    <strong>
                      ⏱️ Болзсон хугацаа:
                    </strong>{' '}
                    {getDuration(
                      item.started_at,
                      item.ended_at
                    )}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      onClick={() =>
                        navigate(
                          `/profile-view/${item.otherUserId}`
                        )
                      }
                      style={{
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#ff69b4',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      👤 Profile үзэх
                    </button>

                    {isCreator && (
                      <button
                        onClick={() =>
                          startEdit(
                            item
                          )
                        }
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          backgroundColor: '#ffc107',
                          color: 'black',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Засах
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        )
      )}
    </div>
  );
}