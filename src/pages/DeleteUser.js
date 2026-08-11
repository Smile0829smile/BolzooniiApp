import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

export default function DeleteUser() {
  const { id } = useParams();
  const navigate = useNavigate();

  // =====================================================
  // ХЭРЭГЛЭГЧИЙН МЭДЭЭЛЭЛ
  // =====================================================

  const [currentUser, setCurrentUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);

  // =====================================================
  // НУУЦ КОДУУД
  // =====================================================

  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [code3, setCode3] = useState('');

  // =====================================================
  // КОД ХАРУУЛАХ / НУУХ
  // =====================================================

  const [showCode1, setShowCode1] = useState(false);
  const [showCode2, setShowCode2] = useState(false);
  const [showCode3, setShowCode3] = useState(false);

  // =====================================================
  // PAGE STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  // =====================================================
  // ХУУДАС АЧААЛАХ
  // =====================================================

  useEffect(() => {
    loadPage();
  }, [id]);

  // =====================================================
  // CREATOR + УСТГАХ ХЭРЭГЛЭГЧИЙГ АВАХ
  // =====================================================

  async function loadPage() {
    try {
      setLoading(true);
      setError(null);

      // ===============================================
      // НЭВТЭРСЭН ХЭРЭГЛЭГЧ
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
      // ӨӨРИЙН PROFILE
      // ===============================================

      const {
        data: me,
        error: meError,
      } = await supabase
        .from('profiles')
        .select(
          'id, username, nickname, is_creator'
        )
        .eq('id', user.id)
        .single();

      if (meError) {
        throw meError;
      }

      // ===============================================
      // CREATOR ЭСЭХИЙГ ШАЛГАХ
      // ===============================================

      if (!me?.is_creator) {
        throw new Error(
          'Зөвхөн Creator энэ хуудсанд нэвтрэх боломжтой.'
        );
      }

      setCurrentUser(me);

      // ===============================================
      // УСТГАХ ХЭРЭГЛЭГЧ
      // ===============================================

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

      // ===============================================
      // ӨӨРИЙГӨӨ УСТГАХ БОЛОМЖГҮЙ
      // ===============================================

      if (target.id === me.id) {
        throw new Error(
          'Та өөрийн Creator бүртгэлийг устгах боломжгүй.'
        );
      }

      // ===============================================
      // CREATOR УСТГАХ БОЛОМЖГҮЙ
      // ===============================================

      if (target.is_creator) {
        throw new Error(
          'Creator бүртгэлийг эндээс устгах боломжгүй.'
        );
      }

      setTargetUser(target);
    } catch (err) {
      console.error(
        'DeleteUser load error:',
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // 3 НУУЦ КОДЫГ ШАЛГАХ
  // =====================================================

  async function handleContinue() {
    if (!currentUser?.is_creator) {
      alert(
        'Зөвхөн Creator энэ үйлдлийг хийх боломжтой.'
      );
      return;
    }

    if (!targetUser) {
      alert(
        'Устгах хэрэглэгч олдсонгүй.'
      );
      return;
    }

    // ===============================================
    // 3 КОДЫГ БҮГДИЙГ НЬ ШААРДАХ
    // ===============================================

    if (
      !code1.trim() ||
      !code2.trim() ||
      !code3.trim()
    ) {
      alert(
        '3 нууц кодыг бүгдийг нь оруулна уу.'
      );
      return;
    }

    try {
      setChecking(true);
      setError(null);

      // ===============================================
      // SESSION АВАХ
      // ===============================================

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error(
          'Нэвтрэлтийн мэдээлэл олдсонгүй. Дахин нэвтэрнэ үү.'
        );
      }

      // ===============================================
      // EDGE FUNCTION ДУУДАХ
      //
      // Таны function endpoint slug:
      // swift-processor
      // ===============================================

      const {
        data,
        error: functionError,
      } =
        await supabase.functions.invoke(
          'swift-processor',
          {
            body: {
              userId:
                targetUser.id,

              code1:
                code1.trim(),

              code2:
                code2.trim(),

              code3:
                code3.trim(),
            },

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

      // ===============================================
      // FUNCTION ERROR
      // ===============================================

      if (functionError) {
        console.error(
          'Edge Function error:',
          functionError
        );

        throw functionError;
      }

      // ===============================================
      // SERVER ТАТГАЛЗСАН
      // ===============================================

      if (!data?.success) {
        throw new Error(
          data?.error ||
            'Нууц кодыг шалгаж чадсангүй.'
        );
      }

        // ===============================================
        // АМЖИЛТТАЙ
        // ===============================================

        alert(
            `✅ ${
            data.target?.username ||
            targetUser.username
            } хэрэглэгч амжилттай устгагдлаа.`
        );
        
        navigate('/leaderboard', {
            replace: true,
        });
    } catch (err) {
      console.error(
        'Delete verification error:',
        err
      );

      setError(err.message);

      alert(
        `❌ Шалгалт амжилтгүй боллоо:\n${err.message}`
      );
    } finally {
      setChecking(false);
    }
  }

  // =====================================================
  // АЧААЛЖ БАЙНА
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <p>
          Уншиж байна...
        </p>
      </div>
    );
  }

  // =====================================================
  // ХУУДАС АЧААЛАХАД АЛДАА ГАРСАН
  // =====================================================

  if (
    error &&
    !targetUser
  ) {
    return (
      <div
        style={{
          maxWidth: '500px',
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
            navigate(-1)
          }
          style={{
            padding: '7px 10px',
            cursor: 'pointer',
          }}
        >
          🔙 Буцах
        </button>
      </div>
    );
  }

  // =====================================================
  // ХЭРЭГЛЭГЧ ОЛДООГҮЙ
  // =====================================================

  if (!targetUser) {
    return (
      <div
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <p>
          Хэрэглэгч олдсонгүй.
        </p>
      </div>
    );
  }

  // =====================================================
  // STYLE
  // =====================================================

  const inputStyle = {
    width: '100%',
    padding: '10px',
    boxSizing: 'border-box',
    borderRadius: '5px',
    border: '1px solid #ccc',
    outline: 'none',
  };

  const showButtonStyle = {
    minWidth: '85px',
    padding: '0 10px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
  };

  const codeRowStyle = {
    display: 'flex',
    gap: '6px',
    marginTop: '5px',
    marginBottom: '14px',
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: '20px',
      }}
    >
      {/* =================================================
          БУЦАХ
      ================================================= */}

      <button
        onClick={() =>
          navigate(-1)
        }
        style={{
          marginBottom: '18px',
          padding: '7px 10px',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        🔙 Буцах
      </button>

      {/* =================================================
          ГАРЧИГ
      ================================================= */}

      <h2>
        🗑️ Хэрэглэгч устгах
      </h2>

      {/* =================================================
          УСТГАХ ХЭРЭГЛЭГЧ
      ================================================= */}

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* PROFILE PICTURE */}

          {targetUser.profile_pic ? (
            <img
              src={
                targetUser.profile_pic
              }
              alt={
                targetUser.username
              }
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#eee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '25px',
              }}
            >
              👤
            </div>
          )}

          {/* ХЭРЭГЛЭГЧИЙН МЭДЭЭЛЭЛ */}

          <div>
            <strong>
              {targetUser.nickname ||
                targetUser.username}
            </strong>

            <br />

            <small>
              @{targetUser.username}
            </small>

            {targetUser.is_admin && (
              <>
                <br />

                <small
                  style={{
                    color: '#007bff',
                    fontWeight: 'bold',
                  }}
                >
                  🛡️ Админ
                </small>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          АНХААРУУЛГА
      ================================================= */}

      <div
        style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '18px',
          fontSize: '13px',
        }}
      >
        <strong>
          ⚠️ Анхааруулга
        </strong>

        <br />
        <br />

        Энэ хуудас нь хэрэглэгчийн бүртгэлийг
        бүр мөсөн устгахад зориулагдсан.

        <br />
        <br />

        Үргэлжлүүлэхийн тулд 3 нууц кодыг
        бүгдийг нь зөв оруулах шаардлагатай.
      </div>

      {/* =================================================
          CODE 1
      ================================================= */}

      <label
        style={{
          fontWeight: 'bold',
        }}
      >
        🔐 Нууц код 1
      </label>

      <div
        style={
          codeRowStyle
        }
      >
        <input
          type={
            showCode1
              ? 'text'
              : 'password'
          }
          value={code1}
          onChange={(e) =>
            setCode1(
              e.target.value
            )
          }
          autoComplete="off"
          placeholder="Нууц код 1"
          style={{
            ...inputStyle,
            flex: 1,
          }}
        />

        <button
          type="button"
          onClick={() =>
            setShowCode1(
              (current) =>
                !current
            )
          }
          style={
            showButtonStyle
          }
        >
          {showCode1
            ? '🙈 Нуух'
            : '👁 Харах'}
        </button>
      </div>

      {/* =================================================
          CODE 2
      ================================================= */}

      <label
        style={{
          fontWeight: 'bold',
        }}
      >
        🔐 Нууц код 2
      </label>

      <div
        style={
          codeRowStyle
        }
      >
        <input
          type={
            showCode2
              ? 'text'
              : 'password'
          }
          value={code2}
          onChange={(e) =>
            setCode2(
              e.target.value
            )
          }
          autoComplete="off"
          placeholder="Нууц код 2"
          style={{
            ...inputStyle,
            flex: 1,
          }}
        />

        <button
          type="button"
          onClick={() =>
            setShowCode2(
              (current) =>
                !current
            )
          }
          style={
            showButtonStyle
          }
        >
          {showCode2
            ? '🙈 Нуух'
            : '👁 Харах'}
        </button>
      </div>

      {/* =================================================
          CODE 3
      ================================================= */}

      <label
        style={{
          fontWeight: 'bold',
        }}
      >
        🔐 Нууц код 3
      </label>

      <div
        style={
          codeRowStyle
        }
      >
        <input
          type={
            showCode3
              ? 'text'
              : 'password'
          }
          value={code3}
          onChange={(e) =>
            setCode3(
              e.target.value
            )
          }
          autoComplete="off"
          placeholder="Нууц код 3"
          style={{
            ...inputStyle,
            flex: 1,
          }}
        />

        <button
          type="button"
          onClick={() =>
            setShowCode3(
              (current) =>
                !current
            )
          }
          style={
            showButtonStyle
          }
        >
          {showCode3
            ? '🙈 Нуух'
            : '👁 Харах'}
        </button>
      </div>

      {/* =================================================
          АЛДАА
      ================================================= */}

      {error && (
        <div
          style={{
            padding: '10px',
            marginBottom: '15px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* =================================================
          ҮРГЭЛЖЛҮҮЛЭХ
      ================================================= */}

      <button
        onClick={
          handleContinue
        }
        disabled={
          checking ||
          !code1.trim() ||
          !code2.trim() ||
          !code3.trim()
        }
        style={{
          width: '100%',
          padding: '10px',
          marginTop: '6px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: '#8b0000',
          color: 'white',
          fontWeight: 'bold',

          cursor:
            checking
              ? 'not-allowed'
              : 'pointer',

          opacity:
            checking ||
            !code1.trim() ||
            !code2.trim() ||
            !code3.trim()
              ? 0.5
              : 1,
        }}
      >
        {checking
          ? 'Нууц код шалгаж байна...'
          : '🔐 Үргэлжлүүлэх'}
      </button>
    </div>
  );
}