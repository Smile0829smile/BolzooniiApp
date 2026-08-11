import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';

export default function ProfileEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  const [avatarPhotos, setAvatarPhotos] = useState([]);
  const [extraPhotos, setExtraPhotos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [extraPhotoUploading, setExtraPhotoUploading] = useState(false);

  const [deletingAvatarPath, setDeletingAvatarPath] = useState(null);
  const [deletingPhotoKey, setDeletingPhotoKey] = useState(null);

  const [error, setError] = useState(null);

  useEffect(() => {
    loadPage();
  }, [id]);

  // =====================================================
  // CHECK CREATOR
  // =====================================================

  async function checkCreator() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      throw new Error('User not logged in');
    }

    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id, username, is_creator')
      .eq('id', user.id)
      .single();

    if (creatorError) throw creatorError;

    if (!creator?.is_creator) {
      throw new Error('Creator access required');
    }

    return creator;
  }

  // =====================================================
  // STORAGE HELPERS
  // =====================================================

  function getStoragePathFromUrl(url) {
    if (!url) return null;

    const marker =
      '/storage/v1/object/public/avatars/';

    const index = url.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      url.substring(index + marker.length)
    );
  }

  function getPublicUrl(storagePath) {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  // =====================================================
  // LOAD PAGE
  // =====================================================

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      await checkCreator();

      const { data: profileData, error: profileError } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

      if (profileError) throw profileError;

      if (!profileData) {
        throw new Error('Profile not found');
      }

      setProfile(profileData);

      await fetchAvatarPhotos(profileData);
      await fetchAllExtraPhotos(profileData);
    } catch (err) {
      console.error(
        'Profile edit load error:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FETCH ALL PFP FILES
  // avatars/USER_ID/*
  // =====================================================

  async function fetchAvatarPhotos(profileData) {
    try {
      const folderPath =
        `avatars/${profileData.id}`;

      const {
        data: files,
        error,
      } = await supabase.storage
        .from('avatars')
        .list(folderPath, {
          limit: 100,
          sortBy: {
            column: 'created_at',
            order: 'desc',
          },
        });

      if (error) {
        throw error;
      }

      const currentPath =
        getStoragePathFromUrl(
          profileData.profile_pic
        );

      const photos =
        (files || [])
          .filter((file) => file.name)
          .map((file) => {
            const storagePath =
              `${folderPath}/${file.name}`;

            return {
              name: file.name,
              storage_path: storagePath,
              photo_url:
                getPublicUrl(storagePath),
              created_at:
                file.created_at || null,
              is_current:
                storagePath === currentPath,
            };
          });

      setAvatarPhotos(photos);
    } catch (err) {
      console.error(
        'Avatar photos error:',
        err
      );

      setAvatarPhotos([]);
    }
  }

  // =====================================================
  // FETCH EXTRA PHOTOS
  // =====================================================

  async function fetchAllExtraPhotos(profileData) {
    try {
      const { data: dbPhotos, error: dbError } =
        await supabase
          .from('extra_photos')
          .select(
            'id, user_id, photo_url, created_at'
          )
          .eq('user_id', profileData.id)
          .order('created_at', {
            ascending: false,
          });

      if (dbError) {
        console.error(
          'Extra photos DB error:',
          dbError
        );
      }

      const folderPath =
        `extra_photos/${profileData.id}`;

      const {
        data: storageFiles,
        error: storageError,
      } = await supabase.storage
        .from('avatars')
        .list(folderPath, {
          limit: 100,
          sortBy: {
            column: 'created_at',
            order: 'desc',
          },
        });

      if (storageError) {
        console.error(
          'Extra photos Storage error:',
          storageError
        );
      }

      const combined = [];

      (dbPhotos || []).forEach((photo) => {
        const storagePath =
          getStoragePathFromUrl(
            photo.photo_url
          );

        combined.push({
          id: photo.id,
          user_id: photo.user_id,
          photo_url: photo.photo_url,
          storage_path: storagePath,
          created_at: photo.created_at,
          source: 'database',
        });
      });

      (storageFiles || []).forEach((file) => {
        if (!file.name) return;

        const storagePath =
          `${folderPath}/${file.name}`;

        const exists =
          combined.some(
            (photo) =>
              photo.storage_path ===
              storagePath
          );

        if (exists) return;

        combined.push({
          id: null,
          storage_id:
            file.id || storagePath,
          user_id:
            profileData.id,
          photo_url:
            getPublicUrl(storagePath),
          storage_path:
            storagePath,
          created_at:
            file.created_at || null,
          source: 'storage',
        });
      });

      setExtraPhotos(combined);
    } catch (err) {
      console.error(
        'fetchAllExtraPhotos error:',
        err
      );

      setExtraPhotos([]);
    }
  }

  // =====================================================
  // CHANGE PROFILE FIELD
  // =====================================================

  function handleChange(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  async function handleSave() {
    try {
      setSaving(true);

      await checkCreator();

      if (!profile.username?.trim()) {
        alert(
          'Username хоосон байж болохгүй.'
        );
        return;
      }

      if (!profile.nickname?.trim()) {
        alert(
          'Nickname хоосон байж болохгүй.'
        );
        return;
      }

      const {
        data: usernameOwner,
        error: usernameError,
      } = await supabase
        .from('profiles')
        .select('id')
        .eq(
          'username',
          profile.username.trim()
        )
        .neq('id', profile.id)
        .maybeSingle();

      if (usernameError) {
        throw usernameError;
      }

      if (usernameOwner) {
        alert(
          'Энэ username аль хэдийн ашиглагдаж байна.'
        );
        return;
      }

      const { error: updateError } =
        await supabase
          .from('profiles')
          .update({
            username:
              profile.username.trim(),

            nickname:
              profile.nickname.trim(),

            phone_number:
              profile.phone_number?.trim() ||
              null,

            gender:
              profile.gender || null,

            birthdate:
              profile.birthdate || null,

            location:
              profile.location?.trim() ||
              null,

            christma_points:
              Number(
                profile.christma_points
              ) || 0,

            date_points:
              Number(
                profile.date_points
              ) || 0,

            like_count:
              Number(
                profile.like_count
              ) || 0,

            date_count:
              Number(
                profile.date_count
              ) || 0,

            anhaaruulga:
              Math.max(
                0,
                Number(
                  profile.anhaaruulga
                ) || 0
              ),

            is_admin:
              profile.is_admin === true,

            is_creator:
              profile.is_creator === true,

            is_banned:
              profile.is_banned === true,

            is_in_relationship:
              profile.is_in_relationship ===
              true,

            is_on_break:
              profile.is_on_break === true,

            agreed_to_rules:
              profile.agreed_to_rules ===
              true,
          })
          .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      alert(
        'Profile амжилттай хадгалагдлаа.'
      );
    } catch (err) {
      console.error(
        'Save error:',
        err
      );

      alert(
        `Profile хадгалахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // ADD NEW PFP
  // =====================================================

  async function handleAvatarUpload(event) {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(
        'Зөвхөн зураг upload хийх боломжтой.'
      );
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      alert(
        'Зураг 10MB-аас бага байх ёстой.'
      );
      return;
    }

    try {
      setAvatarUploading(true);

      await checkCreator();

      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'jpg';

      const filename =
        `${Date.now()}.${extension}`;

      const storagePath =
        `avatars/${profile.id}/${filename}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from('avatars')
        .upload(
          storagePath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType:
              file.type,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const newUrl =
        getPublicUrl(storagePath);

      const {
        error: updateError,
      } = await supabase
        .from('profiles')
        .update({
          profile_pic:
            newUrl,
        })
        .eq(
          'id',
          profile.id
        );

      if (updateError) {
        await supabase.storage
          .from('avatars')
          .remove([
            storagePath,
          ]);

        throw updateError;
      }

      const updatedProfile = {
        ...profile,
        profile_pic:
          newUrl,
      };

      setProfile(
        updatedProfile
      );

      await fetchAvatarPhotos(
        updatedProfile
      );

      alert(
        'PFP амжилттай нэмэгдлээ.'
      );
    } catch (err) {
      console.error(
        'PFP upload error:',
        err
      );

      alert(
        `PFP upload хийхэд алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  // =====================================================
  // USE EXISTING PFP
  // =====================================================

  async function handleUseAvatar(
    avatar
  ) {
    if (avatar.is_current) {
      return;
    }

    const confirmed =
      window.confirm(
        'Энэ зургийг үндсэн PFP болгох уу?'
      );

    if (!confirmed) return;

    try {
      await checkCreator();

      const {
        error: updateError,
      } = await supabase
        .from('profiles')
        .update({
          profile_pic:
            avatar.photo_url,
        })
        .eq(
          'id',
          profile.id
        );

      if (updateError) {
        throw updateError;
      }

      const updatedProfile = {
        ...profile,
        profile_pic:
          avatar.photo_url,
      };

      setProfile(
        updatedProfile
      );

      await fetchAvatarPhotos(
        updatedProfile
      );

      alert(
        'PFP амжилттай солигдлоо.'
      );
    } catch (err) {
      console.error(
        'Use PFP error:',
        err
      );

      alert(
        `PFP солиход алдаа гарлаа:\n${err.message}`
      );
    }
  }

  // =====================================================
  // DELETE ONE PFP
  // =====================================================

  async function handleDeleteAvatar(
    avatar
  ) {
    const confirmed =
      window.confirm(
        avatar.is_current
          ? 'Одоо ашиглаж байгаа PFP-г устгах уу?'
          : 'Энэ PFP зургийг устгах уу?'
      );

    if (!confirmed) return;

    try {
      setDeletingAvatarPath(
        avatar.storage_path
      );

      await checkCreator();

      const {
        error: storageError,
      } = await supabase.storage
        .from('avatars')
        .remove([
          avatar.storage_path,
        ]);

      if (storageError) {
        throw storageError;
      }

      let updatedProfile =
        profile;

      if (avatar.is_current) {
        const {
          error: profileError,
        } = await supabase
          .from('profiles')
          .update({
            profile_pic: null,
          })
          .eq(
            'id',
            profile.id
          );

        if (profileError) {
          throw profileError;
        }

        updatedProfile = {
          ...profile,
          profile_pic: null,
        };

        setProfile(
          updatedProfile
        );
      }

      await fetchAvatarPhotos(
        updatedProfile
      );

      alert(
        'PFP устгагдлаа.'
      );
    } catch (err) {
      console.error(
        'Delete PFP error:',
        err
      );

      alert(
        `PFP устгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingAvatarPath(
        null
      );
    }
  }

  // =====================================================
  // ADD EXTRA PHOTO
  // =====================================================

  async function handleAddExtraPhoto(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    if (
      extraPhotos.length >= 3
    ) {
      alert(
        `Энэ хэрэглэгч ${extraPhotos.length} зурагтай байна.\n` +
          'Maximum 3 extra photos allowed.'
      );
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert(
        'Зөвхөн зураг upload хийх боломжтой.'
      );
      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      alert(
        'Зураг 10MB-аас бага байх ёстой.'
      );
      return;
    }

    try {
      setExtraPhotoUploading(true);

      await checkCreator();

      const folderPath =
        `extra_photos/${profile.id}`;

      const {
        data: existingFiles,
        error: listError,
      } = await supabase.storage
        .from('avatars')
        .list(folderPath, {
          limit: 100,
        });

      if (listError) {
        throw listError;
      }

      const realFiles =
        (existingFiles || []).filter(
          (file) =>
            file.name
        );

      if (
        realFiles.length >= 3
      ) {
        alert(
          `Storage-д ${realFiles.length} зураг байна.\n` +
            'Maximum 3 extra photos.'
        );

        return;
      }

      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'jpg';

      const filename =
        `${Date.now()}.${extension}`;

      const storagePath =
        `extra_photos/${profile.id}/${filename}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from('avatars')
        .upload(
          storagePath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType:
              file.type,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const photoUrl =
        getPublicUrl(
          storagePath
        );

      const {
        error: insertError,
      } = await supabase
        .from('extra_photos')
        .insert({
          user_id:
            profile.id,

          photo_url:
            photoUrl,
        });

      if (insertError) {
        await supabase.storage
          .from('avatars')
          .remove([
            storagePath,
          ]);

        throw insertError;
      }

      await fetchAllExtraPhotos(
        profile
      );

      alert(
        'Extra зураг амжилттай нэмэгдлээ.'
      );
    } catch (err) {
      console.error(
        'Extra photo upload error:',
        err
      );

      alert(
        `Зураг нэмэхэд алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setExtraPhotoUploading(false);
    }
  }

  // =====================================================
  // DELETE EXTRA PHOTO
  // =====================================================

  async function handleDeleteExtraPhoto(
    photo
  ) {
    const key =
      photo.id ||
      photo.storage_path;

    const confirmed =
      window.confirm(
        'Энэ extra зургийг бүр мөсөн устгах уу?'
      );

    if (!confirmed) return;

    try {
      setDeletingPhotoKey(
        key
      );

      await checkCreator();

      if (photo.storage_path) {
        const {
          error: storageError,
        } = await supabase.storage
          .from('avatars')
          .remove([
            photo.storage_path,
          ]);

        if (storageError) {
          throw storageError;
        }
      }

      if (photo.id) {
        const {
          error: dbError,
        } = await supabase
          .from('extra_photos')
          .delete()
          .eq(
            'id',
            photo.id
          );

        if (dbError) {
          throw dbError;
        }
      } else if (
        photo.photo_url
      ) {
        await supabase
          .from('extra_photos')
          .delete()
          .eq(
            'photo_url',
            photo.photo_url
          );
      }

      await fetchAllExtraPhotos(
        profile
      );

      alert(
        'Extra зураг устгагдлаа.'
      );
    } catch (err) {
      console.error(
        'Delete extra photo error:',
        err
      );

      alert(
        `Зураг устгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingPhotoKey(
        null
      );
    }
  }

  // =====================================================
  // LOADING / ERROR
  // =====================================================

  if (loading) {
    return (
      <p>
        Profile ачаалж байна...
      </p>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
        }}
      >
        <p
          style={{
            color: 'red',
          }}
        >
          ❌ {error}
        </p>

        <button
          onClick={() =>
            navigate('/leaderboard')
          }
        >
          🔙 Leaderboard
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <p>
        Profile олдсонгүй.
      </p>
    );
  }

  // =====================================================
  // STYLES
  // =====================================================

  const inputStyle = {
    width: '100%',
    padding: '9px',
    marginTop: '5px',
    marginBottom: '15px',
    boxSizing: 'border-box',
    borderRadius: '5px',
    border: '1px solid #ccc',
  };

  const labelStyle = {
    fontWeight: 'bold',
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      style={{
        maxWidth: '900px',
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
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        🔙 Profile руу буцах
      </button>

      <h1>
        ✏️ Edit Profile
      </h1>

      <h2>
        {profile.username}
      </h2>

      {/* =================================================
          ALL PFP PHOTOS
      ================================================= */}

      <hr />

      <h3>
        🖼️ PFP Photos ({avatarPhotos.length})
      </h3>

      {avatarPhotos.length > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          {avatarPhotos.map(
            (avatar) => (
              <div
                key={
                  avatar.storage_path
                }
                style={{
                  width: '150px',
                  padding: '10px',
                  borderRadius: '8px',
                  textAlign: 'center',

                  border:
                    avatar.is_current
                      ? '2px solid #28a745'
                      : '1px solid #ddd',
                }}
              >
                <img
                  src={
                    avatar.photo_url
                  }
                  alt="PFP"
                  style={{
                    width: '130px',
                    height: '130px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />

                {avatar.is_current ? (
                  <p
                    style={{
                      color: '#28a745',
                      fontWeight: 'bold',
                    }}
                  >
                    ✅ Current PFP
                  </p>
                ) : (
                  <button
                    onClick={() =>
                      handleUseAvatar(
                        avatar
                      )
                    }
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '7px',
                      border: 'none',
                      borderRadius: '5px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    🖼️ Use as PFP
                  </button>
                )}

                <button
                  onClick={() =>
                    handleDeleteAvatar(
                      avatar
                    )
                  }
                  disabled={
                    deletingAvatarPath ===
                    avatar.storage_path
                  }
                  style={{
                    width: '100%',
                    marginTop: '6px',
                    padding: '7px',
                    border: 'none',
                    borderRadius: '5px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {deletingAvatarPath ===
                  avatar.storage_path
                    ? 'Deleting...'
                    : '🗑️ Delete'}
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <p>
          Энэ хэрэглэгч PFP оруулаагүй байна.
        </p>
      )}

      <label
        style={{
          display: 'inline-block',
          padding: '9px 13px',
          backgroundColor: '#28a745',
          color: 'white',
          borderRadius: '5px',

          cursor:
            avatarUploading
              ? 'not-allowed'
              : 'pointer',

          opacity:
            avatarUploading
              ? 0.6
              : 1,

          marginBottom: '25px',
        }}
      >
        ➕ Add PFP

        <input
          type="file"
          accept="image/*"
          disabled={
            avatarUploading
          }
          onChange={
            handleAvatarUpload
          }
          style={{
            display: 'none',
          }}
        />
      </label>

      {/* =================================================
          EXTRA PHOTOS
      ================================================= */}

      <hr />

      <h3>
        📸 Extra Photos ({extraPhotos.length})
      </h3>

      {extraPhotos.length > 3 && (
        <div
          style={{
            padding: '10px',
            backgroundColor: '#fff3cd',
            borderRadius: '5px',
            marginBottom: '15px',
          }}
        >
          ⚠️ Энэ хэрэглэгч{' '}
          <strong>
            {extraPhotos.length}
          </strong>{' '}
          extra зурагтай байна.

          <br />

          Maximum: 3
        </div>
      )}

      {extraPhotos.length > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '15px',
          }}
        >
          {extraPhotos.map(
            (photo) => {
              const photoKey =
                photo.id ||
                photo.storage_path;

              return (
                <div
                  key={photoKey}
                  style={{
                    textAlign: 'center',
                    border:
                      '1px solid #ddd',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <img
                    src={
                      photo.photo_url
                    }
                    alt="Extra"
                    style={{
                      width: '130px',
                      height: '130px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      display: 'block',
                    }}
                  />

                  <button
                    onClick={() =>
                      handleDeleteExtraPhoto(
                        photo
                      )
                    }
                    disabled={
                      deletingPhotoKey ===
                      photoKey
                    }
                    style={{
                      marginTop: '7px',
                      padding: '6px 10px',
                      border: 'none',
                      borderRadius: '5px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {deletingPhotoKey ===
                    photoKey
                      ? 'Deleting...'
                      : '🗑️ Delete'}
                  </button>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <p>
          Extra зураг байхгүй.
        </p>
      )}

      {extraPhotos.length < 3 ? (
        <label
          style={{
            display: 'inline-block',
            padding: '9px 13px',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '5px',

            cursor:
              extraPhotoUploading
                ? 'not-allowed'
                : 'pointer',

            marginBottom: '25px',
          }}
        >
          ➕ Add Extra Photo

          <input
            type="file"
            accept="image/*"
            disabled={
              extraPhotoUploading
            }
            onChange={
              handleAddExtraPhoto
            }
            style={{
              display: 'none',
            }}
          />
        </label>
      ) : (
        <p
          style={{
            color: '#777',
            marginBottom: '25px',
          }}
        >
          Maximum 3 extra photos allowed.
        </p>
      )}

      {/* =================================================
          PROFILE INFORMATION
      ================================================= */}

      <hr />

      <h3>
        👤 Profile Information
      </h3>

      <label style={labelStyle}>
        Username
      </label>

      <input
        value={
          profile.username || ''
        }
        onChange={(e) =>
          handleChange(
            'username',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        Nickname
      </label>

      <input
        value={
          profile.nickname || ''
        }
        onChange={(e) =>
          handleChange(
            'nickname',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        Утасны дугаар
      </label>

      <input
        value={
          profile.phone_number || ''
        }
        onChange={(e) =>
          handleChange(
            'phone_number',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        Хүйс
      </label>

      <select
        value={
          profile.gender || ''
        }
        onChange={(e) =>
          handleChange(
            'gender',
            e.target.value
          )
        }
        style={inputStyle}
      >
        <option value="">
          Хүйсээ сонгоно уу
        </option>

        <option value="Эрэгтэй">
          Эрэгтэй
        </option>

        <option value="Эмэгтэй">
          Эмэгтэй
        </option>
      </select>

      <label style={labelStyle}>
        Төрсөн өдөр
      </label>

      <input
        type="date"
        value={
          profile.birthdate || ''
        }
        onChange={(e) =>
          handleChange(
            'birthdate',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        Байршил
      </label>

      <input
        value={
          profile.location || ''
        }
        onChange={(e) =>
          handleChange(
            'location',
            e.target.value
          )
        }
        style={inputStyle}
      />

      {/* =================================================
          POINTS / STATS
      ================================================= */}

      <hr />

      <h3>
        🏆 Points / Stats
      </h3>

      <label style={labelStyle}>
        Christma Points
      </label>

      <input
        type="number"
        value={
          profile.christma_points ??
          0
        }
        onChange={(e) =>
          handleChange(
            'christma_points',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        💕 Date Points
      </label>

      <input
        type="number"
        value={
          profile.date_points ??
          0
        }
        onChange={(e) =>
          handleChange(
            'date_points',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        Likes
      </label>

      <input
        type="number"
        value={
          profile.like_count ??
          0
        }
        onChange={(e) =>
          handleChange(
            'like_count',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        Date Count
      </label>

      <input
        type="number"
        value={
          profile.date_count ??
          0
        }
        onChange={(e) =>
          handleChange(
            'date_count',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <label style={labelStyle}>
        ⚠️ Анхааруулга
      </label>

      <input
        type="number"
        min="0"
        value={
          profile.anhaaruulga ??
          0
        }
        onChange={(e) =>
          handleChange(
            'anhaaruulga',
            e.target.value
          )
        }
        style={inputStyle}
      />

      <p
        style={{
          marginTop: '-10px',
          marginBottom: '20px',
          color: '#777',
          fontSize: '13px',
        }}
      >
        Одоогийн анхааруулга:{' '}
        <strong>
          {profile.anhaaruulga || 0}
        </strong>
      </p>

      {/* =================================================
          ACCOUNT STATUS
      ================================================= */}

      <hr />

      <h3>
        ⚙️ Account Status
      </h3>

      <div
        style={{
          marginBottom: '10px',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={
              profile.is_admin === true
            }
            onChange={(e) =>
              handleChange(
                'is_admin',
                e.target.checked
              )
            }
          />{' '}
          🛡️ Admin
        </label>
      </div>

      {/* CREATOR CHECKBOX */}
      <div
        style={{
          marginBottom: '10px',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={
              profile.is_creator === true
            }
            onChange={(e) =>
              handleChange(
                'is_creator',
                e.target.checked
              )
            }
          />{' '}
          👑 Creator
        </label>
      </div>

      <div
        style={{
          marginBottom: '10px',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={
              profile.is_banned === true
            }
            onChange={(e) =>
              handleChange(
                'is_banned',
                e.target.checked
              )
            }
          />{' '}
          🚫 Banned
        </label>
      </div>

      <div
        style={{
          marginBottom: '10px',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={
              profile.is_in_relationship ===
              true
            }
            onChange={(e) =>
              handleChange(
                'is_in_relationship',
                e.target.checked
              )
            }
          />{' '}
          ❤️ In Relationship
        </label>
      </div>

      <div
        style={{
          marginBottom: '10px',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={
              profile.is_on_break === true
            }
            onChange={(e) =>
              handleChange(
                'is_on_break',
                e.target.checked
              )
            }
          />{' '}
          ⏸️ On Break
        </label>
      </div>

      <div
        style={{
          marginBottom: '25px',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={
              profile.agreed_to_rules ===
              true
            }
            onChange={(e) =>
              handleChange(
                'agreed_to_rules',
                e.target.checked
              )
            }
          />{' '}
          📜 Agreed To Rules
        </label>
      </div>

      {/* =================================================
          SAVE
      ================================================= */}

      <button
        onClick={
          handleSave
        }
        disabled={
          saving
        }
        style={{
          width: '100%',
          padding: '13px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: '#007bff',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',

          cursor:
            saving
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        {saving
          ? 'Saving...'
          : '💾 Save Changes'}
      </button>
    </div>
  );
}