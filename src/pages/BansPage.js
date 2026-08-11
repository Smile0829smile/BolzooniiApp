import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function BansPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [bans, setBans] = useState([]);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  // =====================================================
  // LOAD PAGE
  // =====================================================

  useEffect(() => {
    loadPage();
  }, []);

  // =====================================================
  // LOAD CREATOR + BANS
  // =====================================================

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      // ===============================================
      // LOGGED-IN USER
      // ===============================================

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          'Та нэвтрээгүй байна.'
        );
      }

      // ===============================================
      // CREATOR PROFILE
      // ===============================================

      const {
        data: me,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, is_creator'
        )
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!me?.is_creator) {
        throw new Error(
          'Зөвхөн Creator энэ хуудсыг ашиглах боломжтой.'
        );
      }

      setCurrentUser(me);

      // ===============================================
      // FETCH BANS
      // ===============================================

      await fetchBans();
    } catch (err) {
      console.error(
        'Bans page load error:',
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
  // FETCH ALL BANS
  // =====================================================

  async function fetchBans() {
    try {
      const {
        data: banRows,
        error: bansError,
      } = await supabase
        .from('bans')
        .select(
          `
          id,
          banned_user_id,
          banned_by_id,
          banned_at
          `
        )
        .order(
          'banned_at',
          {
            ascending: false,
          }
        );

      if (bansError) {
        throw bansError;
      }

      const rows =
        banRows || [];

      // ===============================================
      // COLLECT USER IDS
      // ===============================================

      const userIds = [
        ...new Set(
          rows.flatMap(
            (ban) => [
              ban.banned_user_id,
              ban.banned_by_id,
            ]
          )
        ),
      ].filter(Boolean);

      // ===============================================
      // NO BANS
      // ===============================================

      if (
        userIds.length === 0
      ) {
        setBans([]);
        return;
      }

      // ===============================================
      // FETCH PROFILES
      // ===============================================

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select(
          `
          id,
          username,
          nickname,
          profile_pic,
          is_admin,
          is_creator
          `
        )
        .in(
          'id',
          userIds
        );

      if (profilesError) {
        throw profilesError;
      }

      const profileMap = {};

      (profiles || []).forEach(
        (profile) => {
          profileMap[
            profile.id
          ] = profile;
        }
      );

      // ===============================================
      // COMBINE BAN + PROFILE DATA
      // ===============================================

      const combined =
        rows.map(
          (ban) => ({
            ...ban,

            bannedUser:
              profileMap[
                ban.banned_user_id
              ] || null,

            bannedBy:
              profileMap[
                ban.banned_by_id
              ] || null,
          })
        );

      setBans(combined);
    } catch (err) {
      console.error(
        'Fetch bans error:',
        err
      );

      setError(
        err.message
      );
    }
  }

  // =====================================================
  // END / DELETE BAN
  // =====================================================

  async function handleEndBan(ban) {
    if (
      !currentUser?.is_creator
    ) {
      return;
    }

    const username =
      ban.bannedUser?.nickname ||
      ban.bannedUser?.username ||
      'Unknown User';

    const confirmed =
      window.confirm(
        `${username}-ийн ban-ийг дуусгах уу?\n\n` +
        `bans table-аас энэ ban устгагдана.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        ban.id
      );

      // ===============================================
      // DELETE BAN ROW
      // ===============================================

      const {
        error: deleteError,
      } = await supabase
        .from('bans')
        .delete()
        .eq(
          'id',
          ban.id
        );

      if (deleteError) {
        throw deleteError;
      }

      // ===============================================
      // OPTIONAL:
      // UPDATE profiles.is_banned
      //
      // Your app has used this field before,
      // so keep the two systems synced.
      // ===============================================

      const {
        error: profileUpdateError,
      } = await supabase
        .from('profiles')
        .update({
          is_banned: false,
        })
        .eq(
          'id',
          ban.banned_user_id
        );

      if (profileUpdateError) {
        console.error(
          'Profile unban sync error:',
          profileUpdateError
        );
      }

      // ===============================================
      // NOTIFICATION
      // ===============================================

      const bannedUsername =
        ban.bannedUser?.username ||
        'Unknown User';

      await supabase
        .from('notifications')
        .insert({
          user_id:
            ban.banned_user_id,

          message:
            `${bannedUsername}-ийн ban дууслаа. ✅`,
        });

      // ===============================================
      // REFRESH
      // ===============================================

      await fetchBans();

      alert(
        `${username}-ийн ban амжилттай дууслаа.`
      );
    } catch (err) {
      console.error(
        'End ban error:',
        err
      );

      alert(
        `Ban дуусгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(value) {
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
  // PROFILE NAME
  // =====================================================

  function getName(profile) {
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
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <p>
          Ban мэдээлэл уншиж байна...
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
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <h2>
          ❌ Алдаа
        </h2>

        <p
          style={{
            color: 'red',
          }}
        >
          {error}
        </p>

        <button
          onClick={() =>
            navigate(
              '/leaderboard'
            )
          }
        >
          🔙 Leaderboard
        </button>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      {/* ===============================================
          BACK
      =============================================== */}

      <button
        onClick={() =>
          navigate(
            '/leaderboard'
          )
        }
        style={{
          padding: '8px 12px',
          marginBottom: '20px',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        🔙 Leaderboard руу буцах
      </button>

      {/* ===============================================
          TITLE
      =============================================== */}

      <h1>
        🚫 Bans
      </h1>

      <p>
        Нийт active ban:{' '}
        <strong>
          {bans.length}
        </strong>
      </p>

      {/* ===============================================
          REFRESH
      =============================================== */}

      <button
        onClick={
          fetchBans
        }
        style={{
          padding: '7px 10px',
          marginBottom: '20px',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        🔄 Шинэчлэх
      </button>

      {/* ===============================================
          NO BANS
      =============================================== */}

      {bans.length === 0 && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            border: '1px solid #ddd',
            borderRadius: '8px',
          }}
        >
          ✅ Одоогоор ban-тай хэрэглэгч байхгүй.
        </div>
      )}

      {/* ===============================================
          BAN LIST
      =============================================== */}

      {bans.map(
        (ban) => {
          const banned =
            ban.bannedUser;

          const banner =
            ban.bannedBy;

          return (
            <div
              key={
                ban.id
              }
              style={{
                border:
                  '1px solid #ddd',

                borderRadius:
                  '10px',

                padding:
                  '15px',

                marginBottom:
                  '15px',
              }}
            >
              {/* =======================================
                  BANNED USER
              ======================================= */}

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '12px',

                  alignItems:
                    'center',

                  marginBottom:
                    '12px',
                }}
              >
                {banned?.profile_pic ? (
                  <img
                    src={
                      banned.profile_pic
                    }
                    alt={
                      banned.username
                    }
                    onClick={() =>
                      navigate(
                        `/profile-view/${ban.banned_user_id}`
                      )
                    }
                    style={{
                      width:
                        '60px',

                      height:
                        '60px',

                      borderRadius:
                        '50%',

                      objectFit:
                        'cover',

                      cursor:
                        'pointer',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width:
                        '60px',

                      height:
                        '60px',

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

                      fontSize:
                        '25px',
                    }}
                  >
                    👤
                  </div>
                )}

                <div>
                  <strong
                    onClick={() =>
                      navigate(
                        `/profile-view/${ban.banned_user_id}`
                      )
                    }
                    style={{
                      cursor:
                        'pointer',

                      fontSize:
                        '18px',
                    }}
                  >
                    🚫{' '}
                    {getName(
                      banned
                    )}
                  </strong>

                  <br />

                  {banned?.username && (
                    <small>
                      @{banned.username}
                    </small>
                  )}

                  {banned?.is_admin && (
                    <>
                      <br />
                      <small>
                        🛡️ Admin
                      </small>
                    </>
                  )}
                </div>
              </div>

              {/* =======================================
                  BAN INFO
              ======================================= */}

              <div
                style={{
                  backgroundColor:
                    '#f8f9fa',

                  padding:
                    '10px',

                  borderRadius:
                    '6px',

                  marginBottom:
                    '12px',
                }}
              >
                <div>
                  <strong>
                    Ban хийсэн:
                  </strong>{' '}
                  {getName(
                    banner
                  )}

                  {banner?.username &&
                    ` (@${banner.username})`}
                </div>

                <div
                  style={{
                    marginTop:
                      '6px',
                  }}
                >
                  <strong>
                    Ban хийсэн огноо:
                  </strong>{' '}
                  {formatDate(
                    ban.banned_at
                  )}
                </div>

                <div
                  style={{
                    marginTop:
                      '6px',
                  }}
                >
                  <strong>
                    Ban ID:
                  </strong>{' '}
                  <small>
                    {ban.id}
                  </small>
                </div>
              </div>

              {/* =======================================
                  ACTIONS
              ======================================= */}

              <div
                style={{
                  display:
                    'flex',

                  gap:
                    '8px',

                  flexWrap:
                    'wrap',
                }}
              >
                <button
                  onClick={() =>
                    navigate(
                      `/profile-view/${ban.banned_user_id}`
                    )
                  }
                  style={{
                    padding:
                      '7px 10px',

                    borderRadius:
                      '5px',

                    cursor:
                      'pointer',
                  }}
                >
                  👤 Profile
                </button>

                <button
                  onClick={() =>
                    handleEndBan(
                      ban
                    )
                  }
                  disabled={
                    deletingId ===
                    ban.id
                  }
                  style={{
                    padding:
                      '7px 10px',

                    border:
                      'none',

                    borderRadius:
                      '5px',

                    backgroundColor:
                      '#28a745',

                    color:
                      'white',

                    fontWeight:
                      'bold',

                    cursor:
                      deletingId ===
                      ban.id
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {deletingId ===
                  ban.id
                    ? 'Дуусгаж байна...'
                    : '✅ Ban дуусгах'}
                </button>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}