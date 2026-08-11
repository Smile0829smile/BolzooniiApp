import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';

export default function WarningPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPage();
  }, [id]);

  // =====================================================
  // LOAD PAGE
  // =====================================================

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      // -------------------------------------------------
      // GET LOGGED-IN USER
      // -------------------------------------------------

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error('User not logged in');
      }

      // -------------------------------------------------
      // GET ADMIN / CREATOR PROFILE
      // -------------------------------------------------

      const {
        data: me,
        error: meError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, is_admin, is_creator'
        )
        .eq('id', user.id)
        .single();

      if (meError) {
        throw meError;
      }

      // Admin OR Creator can access
      if (
        !me?.is_admin &&
        !me?.is_creator
      ) {
        throw new Error(
          'Admin эсвэл Creator эрх шаардлагатай.'
        );
      }

      setCurrentUser(me);

      // -------------------------------------------------
      // GET TARGET USER
      // -------------------------------------------------

      const {
        data: target,
        error: targetError,
      } = await supabase
        .from('profiles')
        .select(
          `
          id,
          username,
          nickname,
          profile_pic,
          anhaaruulga,
          is_admin,
          is_creator
          `
        )
        .eq('id', id)
        .single();

      if (targetError) {
        throw targetError;
      }

      if (!target) {
        throw new Error(
          'Хэрэглэгч олдсонгүй.'
        );
      }

      setTargetUser(target);
    } catch (err) {
      console.error(
        'Warning page load error:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // REFRESH TARGET
  // =====================================================

  async function refreshTargetUser() {
    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select(
        `
        id,
        username,
        nickname,
        profile_pic,
        anhaaruulga,
        is_admin,
        is_creator
        `
      )
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    setTargetUser(data);
  }

  // =====================================================
  // ADD WARNING
  // =====================================================

  async function handleAddWarning() {
    if (!targetUser) return;

    const trimmedReason =
      reason.trim();

    if (!trimmedReason) {
      alert(
        'Анхааруулгын шалтгааныг бичнэ үү.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `${targetUser.username}-д +1 анхааруулга өгөх үү?`
      );

    if (!confirmed) return;

    try {
      setChanging(true);

      const currentWarnings =
        Number(
          targetUser.anhaaruulga
        ) || 0;

      const newWarnings =
        currentWarnings + 1;

      // -------------------------------------------------
      // UPDATE WARNING COUNT
      // -------------------------------------------------

      const {
        error: updateError,
      } = await supabase
        .from('profiles')
        .update({
          anhaaruulga:
            newWarnings,
        })
        .eq(
          'id',
          targetUser.id
        );

      if (updateError) {
        throw updateError;
      }

      // -------------------------------------------------
      // USER NOTIFICATION
      // -------------------------------------------------

      const {
        error: notificationError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id:
            targetUser.id,

          message:
            `⚠️ Танд анхааруулга өглөө. ` +
            `Шалтгаан: ${trimmedReason}. ` +
            `Нийт анхааруулга: ${newWarnings}`,
        });

      if (notificationError) {
        console.error(
          'Warning notification error:',
          notificationError
        );
      }

      await refreshTargetUser();

      setReason('');

      alert(
        `${targetUser.username}-д +1 анхааруулга өглөө.\n` +
        `Нийт анхааруулга: ${newWarnings}`
      );
    } catch (err) {
      console.error(
        'Add warning error:',
        err
      );

      alert(
        `Анхааруулга өгөхөд алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setChanging(false);
    }
  }

  // =====================================================
  // REMOVE WARNING
  // =====================================================

  async function handleRemoveWarning() {
    if (!targetUser) return;

    const currentWarnings =
      Number(
        targetUser.anhaaruulga
      ) || 0;

    if (currentWarnings <= 0) {
      alert(
        'Энэ хэрэглэгч анхааруулгагүй байна.'
      );

      return;
    }

    const trimmedReason =
      reason.trim();

    const confirmed =
      window.confirm(
        `${targetUser.username}-с 1 анхааруулга хасах уу?`
      );

    if (!confirmed) return;

    try {
      setChanging(true);

      const newWarnings =
        Math.max(
          0,
          currentWarnings - 1
        );

      // -------------------------------------------------
      // UPDATE COUNT
      // -------------------------------------------------

      const {
        error: updateError,
      } = await supabase
        .from('profiles')
        .update({
          anhaaruulga:
            newWarnings,
        })
        .eq(
          'id',
          targetUser.id
        );

      if (updateError) {
        throw updateError;
      }

      // -------------------------------------------------
      // NOTIFICATION
      // -------------------------------------------------

      let message =
        `✅ Таны 1 анхааруулгыг хаслаа. ` +
        `Одоогийн анхааруулга: ${newWarnings}`;

      if (trimmedReason) {
        message +=
          `. Шалтгаан: ${trimmedReason}`;
      }

      const {
        error: notificationError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id:
            targetUser.id,

          message,
        });

      if (notificationError) {
        console.error(
          'Remove warning notification error:',
          notificationError
        );
      }

      await refreshTargetUser();

      setReason('');

      alert(
        `${targetUser.username}-с 1 анхааруулга хаслаа.\n` +
        `Одоогийн анхааруулга: ${newWarnings}`
      );
    } catch (err) {
      console.error(
        'Remove warning error:',
        err
      );

      alert(
        `Анхааруулга хасахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setChanging(false);
    }
  }

  // =====================================================
  // RESET WARNINGS
  // =====================================================

  async function handleResetWarnings() {
    if (!targetUser) return;

    const currentWarnings =
      Number(
        targetUser.anhaaruulga
      ) || 0;

    if (currentWarnings === 0) {
      alert(
        'Анхааруулга аль хэдийн 0 байна.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `${targetUser.username}-ийн бүх анхааруулгыг 0 болгох уу?`
      );

    if (!confirmed) return;

    try {
      setChanging(true);

      const {
        error: updateError,
      } = await supabase
        .from('profiles')
        .update({
          anhaaruulga: 0,
        })
        .eq(
          'id',
          targetUser.id
        );

      if (updateError) {
        throw updateError;
      }

      let message =
        '✅ Таны бүх анхааруулгыг арилгалаа.';

      if (reason.trim()) {
        message +=
          ` Шалтгаан: ${reason.trim()}`;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id:
            targetUser.id,

          message,
        });

      await refreshTargetUser();

      setReason('');

      alert(
        `${targetUser.username}-ийн анхааруулгыг 0 болголоо.`
      );
    } catch (err) {
      console.error(
        'Reset warnings error:',
        err
      );

      alert(
        `Анхааруулга reset хийхэд алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setChanging(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <p>
        Loading warning page...
      </p>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <h2>
          ❌ Error
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
            navigate(-1)
          }
        >
          🔙 Буцах
        </button>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <p>
        Хэрэглэгч олдсонгүй.
      </p>
    );
  }

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
      {/* BACK */}

      <button
        onClick={() =>
          navigate(-1)
        }
        style={{
          marginBottom: '20px',
          padding: '8px 12px',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        🔙 Буцах
      </button>

      <h1>
        ⚠️ Анхааруулга
      </h1>

      {/* =================================================
          TARGET USER
      ================================================= */}

      <div
        style={{
          border:
            '1px solid #ddd',
          borderRadius:
            '10px',
          padding:
            '15px',
          marginBottom:
            '20px',
        }}
      >
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap:
              '15px',
          }}
        >
          {targetUser.profile_pic ? (
            <img
              src={
                targetUser.profile_pic
              }
              alt={
                targetUser.username
              }
              style={{
                width:
                  '80px',
                height:
                  '80px',
                borderRadius:
                  '50%',
                objectFit:
                  'cover',
              }}
            />
          ) : (
            <div
              style={{
                width:
                  '80px',
                height:
                  '80px',
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
                  '35px',
              }}
            >
              👤
            </div>
          )}

          <div>
            <h2
              style={{
                margin:
                  '0 0 5px 0',
              }}
            >
              {targetUser.nickname ||
                targetUser.username}
            </h2>

            <p
              style={{
                margin: 0,
              }}
            >
              Username:{' '}
              <strong>
                {targetUser.username}
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          WARNING COUNT
      ================================================= */}

      <div
        style={{
          textAlign:
            'center',
          padding:
            '20px',
          backgroundColor:
            '#fff3cd',
          border:
            '1px solid #ffeeba',
          borderRadius:
            '10px',
          marginBottom:
            '20px',
        }}
      >
        <div
          style={{
            fontSize:
              '18px',
            fontWeight:
              'bold',
            marginBottom:
              '10px',
          }}
        >
          Одоогийн анхааруулга
        </div>

        <div
          style={{
            fontSize:
              '45px',
            fontWeight:
              'bold',
          }}
        >
          ⚠️{' '}
          {targetUser.anhaaruulga ||
            0}
        </div>
      </div>

      {/* =================================================
          REASON
      ================================================= */}

      <label
        style={{
          fontWeight:
            'bold',
        }}
      >
        Шалтгаан
      </label>

      <textarea
        value={reason}
        onChange={(e) =>
          setReason(
            e.target.value
          )
        }
        placeholder="Жишээ: Дүрэм зөрчсөн, зохисгүй контент оруулсан..."
        rows={4}
        style={{
          width: '100%',
          boxSizing:
            'border-box',
          padding:
            '10px',
          marginTop:
            '5px',
          marginBottom:
            '20px',
          borderRadius:
            '6px',
          border:
            '1px solid #ccc',
          resize:
            'vertical',
        }}
      />

      {/* =================================================
          ADD
      ================================================= */}

      <button
        onClick={
          handleAddWarning
        }
        disabled={
          changing
        }
        style={{
          width: '100%',
          padding:
            '12px',
          marginBottom:
            '10px',
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
          fontSize:
            '16px',
          cursor:
            changing
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        {changing
          ? 'Loading...'
          : '⚠️ +1 Анхааруулга'}
      </button>

      {/* =================================================
          REMOVE
      ================================================= */}

      <button
        onClick={
          handleRemoveWarning
        }
        disabled={
          changing ||
          (targetUser.anhaaruulga ||
            0) <= 0
        }
        style={{
          width: '100%',
          padding:
            '12px',
          marginBottom:
            '10px',
          border:
            'none',
          borderRadius:
            '6px',
          backgroundColor:
            '#28a745',
          color:
            'white',
          fontWeight:
            'bold',
          fontSize:
            '16px',
          cursor:
            changing
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        ➖ -1 Анхааруулга
      </button>

      {/* =================================================
          RESET
      ================================================= */}

      <button
        onClick={
          handleResetWarnings
        }
        disabled={
          changing ||
          (targetUser.anhaaruulga ||
            0) === 0
        }
        style={{
          width: '100%',
          padding:
            '12px',
          marginBottom:
            '20px',
          border:
            'none',
          borderRadius:
            '6px',
          backgroundColor:
            '#dc3545',
          color:
            'white',
          fontWeight:
            'bold',
          fontSize:
            '16px',
          cursor:
            changing
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        🗑️ Бүх анхааруулгыг арилгах
      </button>

      <hr />

      <p
        style={{
          color:
            '#777',
          fontSize:
            '13px',
        }}
      >
        Logged in as:{' '}
        <strong>
          {currentUser?.username}
        </strong>

        {currentUser?.is_creator
          ? ' 👑 Creator'
          : currentUser?.is_admin
            ? ' 🛡️ Admin'
            : ''}
      </p>
    </div>
  );
}