import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';

function calculateAge(birthdate) {
  if (!birthdate) return null;

  const today = new Date();
  const birth = new Date(birthdate);

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (
    m < 0 ||
    (m === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

export default function ProfileViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [extraPhotos, setExtraPhotos] = useState([]);
  const [expandedImage, setExpandedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [bonusPoints, setBonusPoints] = useState(0);

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

        // =================================================
        // LOGGED-IN USER
        // =================================================

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        // =================================================
        // LOGGED-IN USER PERMISSIONS
        // =================================================

        if (user) {
          const {
            data: me,
            error: meError,
          } = await supabase
            .from('profiles')
            .select(
              'id, username, is_admin, is_creator'
            )
            .eq('id', user.id)
            .single();

          if (meError) {
            throw meError;
          }

          setCurrentUser(me);
        }

        // =================================================
        // PROFILE BEING VIEWED
        // =================================================

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          throw new Error(
            'Profile not found'
          );
        }

        setProfile(profileData);

        // =================================================
        // BONUS HISTORY
        // =================================================

        const {
          data: history,
          error: historyError,
        } = await supabase
          .from('admin_bonus_history')
          .select('points')
          .eq('user_id', id);

        if (
          !historyError &&
          history
        ) {
          const totalBonus =
            history.reduce(
              (sum, row) =>
                sum + row.points,
              0
            );

          setBonusPoints(
            totalBonus
          );
        }

        // =================================================
        // EXTRA PHOTOS
        // =================================================

        const {
          data: photoData,
          error: photoError,
        } = await supabase
          .from('extra_photos')
          .select('*')
          .eq('user_id', id);

        if (photoError) {
          console.error(
            'Error fetching extra photos:',
            photoError
          );
        } else {
          setExtraPhotos(
            photoData || []
          );
        }
      } catch (err) {
        console.error(
          'Profile load error:',
          err
        );

        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [id]);

  // =====================================================
  // IMAGE MODAL
  // =====================================================

  const handleImageClick =
    (url) => {
      setExpandedImage(url);
    };

  const closeImageModal =
    () => {
      setExpandedImage(null);
    };

  // =====================================================
  // LOADING
  // =====================================================

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

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      {/* =================================================
          CREATOR BADGE
      ================================================= */}

      {profile.is_creator && (
        <div
          style={{
            backgroundColor:
              '#fff3cd',
            padding: '10px',
            marginBottom:
              '20px',
            borderRadius:
              '5px',
            color: '#856404',
            fontWeight:
              'bold',
            fontSize: '18px',
            textAlign:
              'center',
          }}
        >
          👑 Creator Account
        </div>
      )}

      {/* =================================================
          ADMIN BADGE
      ================================================= */}

      {profile.is_admin && (
        <div
          style={{
            backgroundColor:
              '#e0f0ff',
            padding: '10px',
            marginBottom:
              '20px',
            borderRadius:
              '5px',
            color: 'blue',
            fontWeight:
              'bold',
            fontSize: '18px',
            textAlign:
              'center',
          }}
        >
          👑 Admin Account
        </div>
      )}

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
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

        {/* CREATOR ONLY */}
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
              color: 'white',
              border: 'none',
              fontWeight:
                'bold',
            }}
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* =================================================
          NAME
      ================================================= */}

      <h1>
        {profile.nickname}
      </h1>

      {/* =================================================
          AVATAR
      ================================================= */}

      {profile.profile_pic ? (
        <img
          src={
            profile.profile_pic
          }
          alt={
            `${profile.username}'s avatar`
          }
          style={{
            width: '100px',
            height: '100px',
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

      {/* =================================================
          USERNAME
      ================================================= */}

      <p>
        <strong>
          Username:
        </strong>{' '}
        {profile.username}
      </p>

      {/* =================================================
          POINTS / STATS
      ================================================= */}

      {!profile.is_admin && (
        <>
          <p>
            <strong>
              Christma оноо:
            </strong>{' '}
            {
              profile.christma_points
            }
          </p>

          <p>
            <strong>
              💕 Болзооны оноо:
            </strong>{' '}
            {
              profile.date_points ||
              0
            }
          </p>

          <p>
            <strong>
              🎁 Bonus:
            </strong>{' '}
            {bonusPoints}
          </p>

          {/* NEW WARNING COUNT */}
          <p>
            <strong>
              ⚠️ Анхааруулга:
            </strong>{' '}
            {
              profile.anhaaruulga ||
              0
            }
          </p>

          <p>
            <strong>
              Likes:
            </strong>{' '}
            {
              profile.like_count
            }
          </p>

          <p>
            <strong>
              Болзоо:
            </strong>{' '}
            {
              profile.date_count
            }
          </p>
        </>
      )}

      {/* =================================================
          PERSONAL INFO
      ================================================= */}

      <p>
        <strong>
          Утас:
        </strong>{' '}
        {
          profile.phone_number ||
          'Not provided'
        }
      </p>

      <p>
        <strong>
          Хүйс:
        </strong>{' '}
        {
          profile.gender ||
          'Not provided'
        }
      </p>

      <p>
        <strong>
          Нас:
        </strong>{' '}
        {
          calculateAge(
            profile.birthdate
          )
        }
      </p>

      {profile.location && (
        <p>
          <strong>
            📍 Байршил:
          </strong>{' '}
          {
            profile.location
          }
        </p>
      )}

      {/* =================================================
          BONUS HISTORY
      ================================================= */}

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

      {/* =================================================
          EXTRA PHOTOS
      ================================================= */}

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
            gap: '10px',
            flexWrap:
              'wrap',
          }}
        >
          {extraPhotos.map(
            (photo) => (
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
          Энэ хэрэглэгч ямар
          ч зураг оруулаагүй
          байна.
        </p>
      )}

      {/* =================================================
          EXPANDED IMAGE
      ================================================= */}

      {expandedImage && (
        <div
          onClick={
            closeImageModal
          }
          style={{
            position:
              'fixed',
            top: 0,
            left: 0,
            zIndex: 1000,
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
              top: '20px',
              right:
                '20px',
              background:
                'rgba(255,255,255,0.8)',
              border:
                'none',
              borderRadius:
                '50%',
              width: '30px',
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