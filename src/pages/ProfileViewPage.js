import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  useParams,
  useNavigate,
} from 'react-router-dom';

function calculateAge(birthdate) {
  if (!birthdate) {
    return null;
  }

  const today = new Date();
  const birth = new Date(
    birthdate
  );

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const m =
    today.getMonth() -
    birth.getMonth();

  if (
    m < 0 ||
    (
      m === 0 &&
      today.getDate() <
        birth.getDate()
    )
  ) {
    age--;
  }

  return age;
}

export default function ProfileViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    extraPhotos,
    setExtraPhotos,
  ] = useState([]);

  const [
    expandedImage,
    setExpandedImage,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [
    bonusPoints,
    setBonusPoints,
  ] = useState(0);

  const [
    likeLoading,
    setLikeLoading,
  ] = useState(false);

  const [
    dateLoading,
    setDateLoading,
  ] = useState(false);

  const [
    dateRequested,
    setDateRequested,
  ] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!id) {
        setError(
          new Error(
            'No user ID provided in URL'
          )
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const {
          data: {
            user,
          },
          error:
            authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (user) {
          const {
            data:
              me,
            error:
              meError,
          } = await supabase
            .from(
              'profiles'
            )
            .select(
              `
              id,
              username,
              is_admin,
              is_creator
              `
            )
            .eq(
              'id',
              user.id
            )
            .single();

          if (
            meError
          ) {
            throw meError;
          }

          setCurrentUser(
            me
          );
        }

        const {
          data:
            profileData,
          error:
            profileError,
        } = await supabase
          .from(
            'profiles'
          )
          .select('*')
          .eq(
            'id',
            id
          )
          .single();

        if (
          profileError
        ) {
          throw profileError;
        }

        if (
          !profileData
        ) {
          throw new Error(
            'Profile not found'
          );
        }

        setProfile(
          profileData
        );

        if (
          user &&
          user.id !==
            id
        ) {
          const {
            data:
              requestRows,
            error:
              requestError,
          } = await supabase
            .from(
              'date_requests'
            )
            .select(
              `
              id,
              requester_id,
              requested_id,
              status,
              created_at
              `
            )
            .or(
              `and(requester_id.eq.${user.id},requested_id.eq.${id}),and(requester_id.eq.${id},requested_id.eq.${user.id})`
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            )
            .limit(1);

          if (
            requestError
          ) {
            console.error(
              'Date request check error:',
              requestError
            );
          } else {
            const newestRequest =
              requestRows?.[0];

            setDateRequested(
              newestRequest?.status ===
                'pending'
            );
          }
        }

        const {
          data:
            history,
          error:
            historyError,
        } = await supabase
          .from(
            'admin_bonus_history'
          )
          .select(
            'points'
          )
          .eq(
            'user_id',
            id
          );

        if (
          !historyError &&
          history
        ) {
          const totalBonus =
            history.reduce(
              (
                sum,
                row
              ) =>
                sum +
                Number(
                  row.points ||
                    0
                ),
              0
            );

          setBonusPoints(
            totalBonus
          );
        }

        const {
          data:
            photoData,
          error:
            photoError,
        } = await supabase
          .from(
            'extra_photos'
          )
          .select('*')
          .eq(
            'user_id',
            id
          );

        if (
          photoError
        ) {
          console.error(
            'Error fetching extra photos:',
            photoError
          );
        } else {
          setExtraPhotos(
            photoData ||
              []
          );
        }
      } catch (err) {
        console.error(
          'Profile load error:',
          err
        );

        setError(
          err
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    fetchProfile();
  }, [id]);

  async function handleLike() {
    if (
      !currentUser ||
      !profile
    ) {
      return;
    }

    if (
      currentUser.id ===
      profile.id
    ) {
      alert(
        'Та өөртөө Like өгөх боломжгүй.'
      );

      return;
    }

    if (
      currentUser.is_admin ||
      currentUser.is_creator ||
      profile.is_admin ||
      profile.is_creator
    ) {
      return;
    }

    try {
      setLikeLoading(
        true
      );

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
            profile.id,
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
            (
              ban
            ) =>
              ban.banned_user_id ===
              currentUser.id
          )
        ) {
          alert(
            'Та бандуулсан байгаа тул Like явуулах боломжгүй.'
          );
        } else {
          alert(
            'Энэ хэрэглэгч бандуулсан байгаа тул Like явуулах боломжгүй.'
          );
        }

        return;
      }

      const today =
        new Date()
          .toISOString()
          .split(
            'T'
          )[0];

      const {
        data:
          existingLikes,
        error:
          likeCheckError,
      } = await supabase
        .from('likes')
        .select(
          'id'
        )
        .eq(
          'liker_id',
          currentUser.id
        )
        .eq(
          'liked_id',
          profile.id
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
        existingLikes &&
        existingLikes.length >
          0
      ) {
        alert(
          'Та энэ хүн рүү өнөөдөр аль хэдийн Like явуулсан байна. Маргааш дахин оролдоно уу.'
        );

        return;
      }

      const {
        data:
          likedUser,
        error:
          userError,
      } = await supabase
        .from(
          'profiles'
        )
        .select(
          `
          username,
          christma_points,
          like_count
          `
        )
        .eq(
          'id',
          profile.id
        )
        .single();

      if (
        userError
      ) {
        throw userError;
      }

      const {
        error:
          insertError,
      } = await supabase
        .from(
          'likes'
        )
        .insert({
          liker_id:
            currentUser.id,

          liked_id:
            profile.id,

          created_at:
            new Date()
              .toISOString(),

          like_day:
            today,
        });

      if (
        insertError
      ) {
        throw insertError;
      }

      const updatedPoints =
        Number(
          likedUser.christma_points ||
            0
        ) +
        2;

      const updatedLikeCount =
        Number(
          likedUser.like_count ||
            0
        ) +
        1;

      const {
        error:
          updateError,
      } = await supabase
        .from(
          'profiles'
        )
        .update({
          christma_points:
            updatedPoints,

          like_count:
            updatedLikeCount,
        })
        .eq(
          'id',
          profile.id
        );

      if (
        updateError
      ) {
        throw updateError;
      }

      setProfile(
        (
          oldProfile
        ) => ({
          ...oldProfile,

          christma_points:
            updatedPoints,

          like_count:
            updatedLikeCount,
        })
      );

      const {
        error:
          notificationError,
      } = await supabase
        .from(
          'notifications'
        )
        .insert({
          user_id:
            null,

          message:
            `${currentUser.username} нь ${likedUser.username} рүү Like явууллаа! ❤️`,
        });

      if (
        notificationError
      ) {
        console.error(
          'Like notification error:',
          notificationError
        );
      }

      alert(
        `Like амжилттай явууллаа! ${likedUser.username} +2 Christma оноо авлаа. ❤️`
      );
    } catch (err) {
      console.error(
        'Like error:',
        err
      );

      alert(
        'Like явуулахад асуудал гарлаа. Дахин оролдоно уу.'
      );
    } finally {
      setLikeLoading(
        false
      );
    }
  }

  async function handleAskDate() {
    if (
      !currentUser ||
      !profile
    ) {
      return;
    }

    if (
      currentUser.id ===
      profile.id
    ) {
      alert(
        'Та өөртэйгөө болзох боломжгүй.'
      );

      return;
    }

    if (
      currentUser.is_admin ||
      currentUser.is_creator ||
      profile.is_admin ||
      profile.is_creator
    ) {
      return;
    }

    try {
      setDateLoading(
        true
      );

      const {
        data:
          activeDating,
        error:
          activeDatingError,
      } = await supabase
        .from(
          'dating'
        )
        .select(
          'id'
        )
        .is(
          'ended_at',
          null
        )
        .or(
          `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
        )
        .limit(1);

      if (
        activeDatingError
      ) {
        throw activeDatingError;
      }

      if (
        activeDating &&
        activeDating.length >
          0
      ) {
        alert(
          'Та өөр хүнтэй болзож байгаа тул тэр болзоогоо дуусгачихаад шинийг эхлүүлнэ үү.'
        );

        return;
      }

      const {
        data:
          targetDating,
        error:
          targetDatingError,
      } = await supabase
        .from(
          'dating'
        )
        .select(
          'id'
        )
        .is(
          'ended_at',
          null
        )
        .or(
          `user1_id.eq.${profile.id},user2_id.eq.${profile.id}`
        )
        .limit(1);

      if (
        targetDatingError
      ) {
        throw targetDatingError;
      }

      if (
        targetDating &&
        targetDating.length >
          0
      ) {
        alert(
          'Энэ хэрэглэгч яг одоо өөр хүнтэй болзож байна.'
        );

        return;
      }

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
            profile.id,
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
            (
              ban
            ) =>
              ban.banned_user_id ===
              currentUser.id
          )
        ) {
          alert(
            'Та бандуулсан байгаа тул болзооны санал явуулах боломжгүй.'
          );
        } else {
          alert(
            'Энэ хэрэглэгч бандуулсан байгаа тул болзооны санал явуулах боломжгүй.'
          );
        }

        return;
      }

      const {
        data:
          todayRequestsCount,
        error:
          todayError,
      } =
        await supabase.rpc(
          'requests_sent_today',
          {
            user_id:
              currentUser.id,
          }
        );

      if (
        todayError
      ) {
        throw todayError;
      }

      if (
        Number(
          todayRequestsCount ||
            0
        ) >
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
        .from(
          'profiles'
        )
        .select(
          `
          username,
          christma_points,
          gender
          `
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
        .from(
          'profiles'
        )
        .select(
          `
          username,
          christma_points,
          date_points,
          gender
          `
        )
        .eq(
          'id',
          profile.id
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
        Number(
          currentProfile.christma_points ||
            0
        ) <
        Number(
          requestedProfile.christma_points ||
            0
        )
      ) {
        alert(
          'Та зөвхөн өөрөөсөө БАГА оноотой хүн рүү болзооны санал явуулах эрхтэй.'
        );

        return;
      }

      const {
        data:
          existingRows,
        error:
          existingRequestError,
      } = await supabase
        .from(
          'date_requests'
        )
        .select(
          `
          id,
          status,
          created_at
          `
        )
        .or(
          `and(requester_id.eq.${currentUser.id},requested_id.eq.${profile.id}),and(requester_id.eq.${profile.id},requested_id.eq.${currentUser.id})`
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(1);

      if (
        existingRequestError
      ) {
        throw existingRequestError;
      }

      const existingRequest =
        existingRows?.[0];

      if (
        existingRequest?.status ===
        'pending'
      ) {
        setDateRequested(
          true
        );

        alert(
          'Та хоёрын хооронд аль хэдийн болзооны санал байна.'
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

      const {
        error:
          insertRequestError,
      } = await supabase
        .from(
          'date_requests'
        )
        .insert([
          {
            requester_id:
              currentUser.id,

            requested_id:
              profile.id,

            status:
              'pending',

            expires_at:
              expiresAt,
          },
        ]);

      if (
        insertRequestError
      ) {
        throw insertRequestError;
      }

      const pointsToAdd =
        Math.floor(
          Number(
            currentProfile.christma_points ||
              0
          ) *
            0.3
        );

      const updatedPoints =
        Number(
          requestedProfile.christma_points ||
            0
        ) +
        pointsToAdd;

      const updatedDatePoints =
        Number(
          requestedProfile.date_points ||
            0
        ) +
        pointsToAdd;

      const {
        error:
          pointsError,
      } = await supabase
        .from(
          'profiles'
        )
        .update({
          christma_points:
            updatedPoints,

          date_points:
            updatedDatePoints,
        })
        .eq(
          'id',
          profile.id
        );

      if (
        pointsError
      ) {
        throw pointsError;
      }

      setProfile(
        (
          oldProfile
        ) => ({
          ...oldProfile,

          christma_points:
            updatedPoints,

          date_points:
            updatedDatePoints,
        })
      );

      setDateRequested(
        true
      );

      const {
        error:
          notificationError,
      } = await supabase
        .from(
          'notifications'
        )
        .insert({
          user_id:
            null,

          message:
            `${currentProfile.username} нь ${requestedProfile.username} рүү болзооны санал явууллаа! 💌`,
        });

      if (
        notificationError
      ) {
        console.error(
          'Date notification error:',
          notificationError
        );
      }

      alert(
        `Болзооны саналыг явууллаа! ${requestedProfile.username} +${pointsToAdd} Christma оноо авлаа.`
      );
    } catch (err) {
      console.error(
        'Ask date error:',
        err
      );

      alert(
        'Болзооны санал илгээх үед асуудал гарлаа.'
      );
    } finally {
      setDateLoading(
        false
      );
    }
  }

  const handleImageClick =
    (
      url
    ) => {
      setExpandedImage(
        url
      );
    };

  const closeImageModal =
    () => {
      setExpandedImage(
        null
      );
    };

  if (loading) {
    return (
      <p>
        Loading profile...
      </p>
    );
  }

  if (error) {
    return (
      <p>
        Could not fetch profile:{' '}
        {error.message}
      </p>
    );
  }

  if (!profile) {
    return (
      <p>
        Profile not found.
      </p>
    );
  }

  const isCreator =
    currentUser?.is_creator ===
    true;

  const isAdmin =
    currentUser?.is_admin ===
    true;

  const isSelf =
    currentUser?.id ===
    profile.id;

  const canSeePrivateInfo =
    isCreator ||
    isAdmin;

  const canManageUser =
    (
      isCreator ||
      isAdmin
    ) &&
    !isSelf;

  const canInteract =
    currentUser &&
    !isSelf &&
    !currentUser.is_admin &&
    !currentUser.is_creator &&
    !profile.is_admin &&
    !profile.is_creator;

  return (
    <div
      style={{
        maxWidth:
          '600px',

        margin:
          '0 auto',

        padding:
          '20px',
      }}
    >
      {profile.is_creator && (
        <div
          style={{
            backgroundColor:
              '#fff3cd',

            padding:
              '10px',

            marginBottom:
              '20px',

            borderRadius:
              '5px',

            color:
              '#856404',

            fontWeight:
              'bold',

            fontSize:
              '18px',

            textAlign:
              'center',
          }}
        >
          👑 Creator Account
        </div>
      )}

      {profile.is_admin &&
        !profile.is_creator && (
          <div
            style={{
              backgroundColor:
                '#e0f0ff',

              padding:
                '10px',

              marginBottom:
                '20px',

              borderRadius:
                '5px',

              color:
                'blue',

              fontWeight:
                'bold',

              fontSize:
                '18px',

              textAlign:
                'center',
            }}
          >
            👑 Admin Account
          </div>
        )}

      <div
        style={{
          display:
            'flex',

          gap:
            '10px',

          flexWrap:
            'wrap',

          marginBottom:
            '20px',
        }}
      >
        <button
          onClick={() =>
            navigate(-1)
          }
          style={{
            padding:
              '8px 12px',

            borderRadius:
              '5px',

            cursor:
              'pointer',
          }}
        >
          🔙 Буцах
        </button>

        {isCreator && (
          <button
            onClick={() =>
              navigate(
                `/profile-edit/${profile.id}`
              )
            }
            style={{
              padding:
                '8px 12px',

              borderRadius:
                '5px',

              cursor:
                'pointer',

              backgroundColor:
                '#007bff',

              color:
                'white',

              border:
                'none',

              fontWeight:
                'bold',
            }}
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <h1>
        {profile.nickname}
      </h1>

      {profile.profile_pic ? (
        <img
          src={
            profile.profile_pic
          }
          alt={
            `${profile.username}'s avatar`
          }
          style={{
            width:
              '100px',

            height:
              '100px',

            borderRadius:
              '50%',

            cursor:
              'pointer',

            objectFit:
              'cover',

            marginBottom:
              '10px',
          }}
          onClick={() =>
            handleImageClick(
              profile.profile_pic
            )
          }
        />
      ) : (
        <p>
          Avatar байхгүй байна.
        </p>
      )}

      <p>
        <strong>
          Username:
        </strong>{' '}

        {profile.username}
      </p>

      {!profile.is_admin &&
        !profile.is_creator && (
          <>
            <p>
              <strong>
                Christma оноо:
              </strong>{' '}

              {profile.christma_points ||
                0}
            </p>

            <p>
              <strong>
                💕 Болзооны оноо:
              </strong>{' '}

              {profile.date_points ||
                0}
            </p>

            <p>
              <strong>
                🎁 Bonus:
              </strong>{' '}

              {bonusPoints}
            </p>

            <p>
              <strong>
                ⚠️ Анхааруулга:
              </strong>{' '}

              {profile.anhaaruulga ||
                0}
            </p>

            <div
              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  '10px',

                marginBottom:
                  '15px',
              }}
            >
              <span>
                <strong>
                  Likes:
                </strong>{' '}

                {profile.like_count ||
                  0}
              </span>

              {canInteract && (
                <button
                  onClick={
                    handleLike
                  }
                  disabled={
                    likeLoading
                  }
                  style={{
                    padding:
                      '6px 10px',

                    border:
                      'none',

                    borderRadius:
                      '6px',

                    backgroundColor:
                      '#ff4d6d',

                    color:
                      'white',

                    fontWeight:
                      'bold',

                    cursor:
                      likeLoading
                        ? 'not-allowed'
                        : 'pointer',

                    opacity:
                      likeLoading
                        ? 0.6
                        : 1,
                  }}
                >
                  {likeLoading
                    ? '...'
                    : '❤️ Like'}
                </button>
              )}
            </div>

            <div
              style={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  '10px',

                marginBottom:
                  '15px',
              }}
            >
              <span>
                <strong>
                  Болзоо:
                </strong>{' '}

                {profile.date_count ||
                  0}
              </span>

              {canInteract && (
                <button
                  onClick={
                    handleAskDate
                  }
                  disabled={
                    dateLoading ||
                    dateRequested
                  }
                  style={{
                    padding:
                      '6px 10px',

                    border:
                      'none',

                    borderRadius:
                      '6px',

                    backgroundColor:
                      dateRequested
                        ? '#999'
                        : '#ff69b4',

                    color:
                      'white',

                    fontWeight:
                      'bold',

                    cursor:
                      dateLoading ||
                      dateRequested
                        ? 'not-allowed'
                        : 'pointer',

                    opacity:
                      dateLoading
                        ? 0.6
                        : 1,
                  }}
                >
                  {dateLoading
                    ? 'Илгээж байна...'
                    : dateRequested
                      ? '✅ Санал явуулсан'
                      : '💌 Болзоо'}
                </button>
              )}
            </div>
          </>
        )}

      {canManageUser &&
        !profile.is_creator && (
          <div
            style={{
              display:
                'flex',

              gap:
                '8px',

              flexWrap:
                'wrap',

              marginTop:
                '15px',

              marginBottom:
                '20px',
            }}
          >
            <button
              onClick={() =>
                navigate(
                  `/admin-bonus/${profile.id}`
                )
              }
              style={{
                padding:
                  '8px 12px',

                border:
                  'none',

                borderRadius:
                  '6px',

                backgroundColor:
                  '#ffc107',

                color:
                  'black',

                fontWeight:
                  'bold',

                cursor:
                  'pointer',
              }}
            >
              🎁 Bonus
            </button>

            <button
              onClick={() =>
                navigate(
                  `/warning/${profile.id}`
                )
              }
              style={{
                padding:
                  '8px 12px',

                border:
                  'none',

                borderRadius:
                  '6px',

                backgroundColor:
                  '#ff9800',

                color:
                  'white',

                fontWeight:
                  'bold',

                cursor:
                  'pointer',
              }}
            >
              ⚠️ Анхааруулга
            </button>
          </div>
        )}

      <p>
        <strong>
          Хүйс:
        </strong>{' '}

        {profile.gender ||
          'Not provided'}
      </p>

      <p>
        <strong>
          Нас:
        </strong>{' '}

        {calculateAge(
          profile.birthdate
        ) ??
          'Not provided'}
      </p>

      {canSeePrivateInfo && (
        <>
          <p>
            <strong>
              📞 Утас:
            </strong>{' '}

            {profile.phone_number ||
              'Not provided'}
          </p>

          <p>
            <strong>
              📧 Email:
            </strong>{' '}

            {profile.email ||
              'Not provided'}
          </p>

          <p>
            <strong>
              📍 Байршил:
            </strong>{' '}

            {profile.location ||
              'Not provided'}
          </p>
        </>
      )}
      <br/>
      <button
        onClick={() =>
          navigate(
            `/date-history/${profile.id}`
          )
        }
        style={{
          marginTop: '10px',
          marginBottom: '15px',
          padding: '9px 13px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: '#ff69b4',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        💕 Болзооны түүх
      </button>
        <br/>
      <button
        onClick={() =>
          navigate(
            `/admin-bonus-history/${profile.id}`
          )
        }
        style={{
          marginTop:
            '15px',

          marginBottom:
            '20px',

          padding:
            '10px 15px',

          borderRadius:
            '5px',

          cursor:
            'pointer',
        }}
      >
        📜 Бонус онооны түүх
      </button>

      <h3
        style={{
          marginTop:
            '30px',
        }}
      >
        📸 Нэмэлт зураг
      </h3>

      {extraPhotos.length >
      0 ? (
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
          {extraPhotos.map(
            (
              photo
            ) => (
              <img
                key={
                  photo.id
                }
                src={
                  photo.photo_url
                }
                alt="Extra"
                onClick={() =>
                  handleImageClick(
                    photo.photo_url
                  )
                }
                style={{
                  width:
                    '100px',

                  height:
                    '100px',

                  objectFit:
                    'cover',

                  borderRadius:
                    '8px',

                  cursor:
                    'pointer',
                }}
              />
            )
          )}
        </div>
      ) : (
        <p>
          Энэ хэрэглэгч ямар ч зураг оруулаагүй байна.
        </p>
      )}

      {expandedImage && (
        <div
          onClick={
            closeImageModal
          }
          style={{
            position:
              'fixed',

            top:
              0,

            left:
              0,

            zIndex:
              1000,

            width:
              '100vw',

            height:
              '100vh',

            backgroundColor:
              'rgba(0, 0, 0, 0.8)',

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            cursor:
              'zoom-out',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();

              closeImageModal();
            }}
            style={{
              position:
                'absolute',

              top:
                '20px',

              right:
                '20px',

              background:
                'rgba(255,255,255,0.8)',

              border:
                'none',

              borderRadius:
                '50%',

              width:
                '30px',

              height:
                '30px',

              fontSize:
                '18px',

              cursor:
                'pointer',

              fontWeight:
                'bold',
            }}
            aria-label="Close image"
            title="Close"
          >
            ×
          </button>

          <img
            src={
              expandedImage
            }
            alt="Expanded"
            style={{
              maxWidth:
                '90%',

              maxHeight:
                '90%',

              borderRadius:
                '12px',

              boxShadow:
                '0 0 20px rgba(255, 255, 255, 0.2)',
            }}
          />
        </div>
      )}
    </div>
  );
}