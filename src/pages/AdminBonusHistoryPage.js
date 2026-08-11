import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminBonusHistoryPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [history, setHistory] = useState([]);

  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editPoints, setEditPoints] = useState("");
  const [editReason, setEditReason] = useState("");

  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadPage();
  }, [userId]);

  async function loadPage() {
    try {
      setLoading(true);

      await checkCreator();
      await loadHistory();
    } catch (err) {
      console.error(
        "Admin bonus history page error:",
        err
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CHECK IF CURRENT USER IS CREATOR
  // =====================================================

  async function checkCreator() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(
        "Auth error:",
        authError
      );

      setIsCreator(false);
      return;
    }

    if (!user) {
      setIsCreator(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("is_creator")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "Creator check error:",
        profileError
      );

      setIsCreator(false);
      return;
    }

    setIsCreator(
      profile?.is_creator === true
    );
  }

  // =====================================================
  // LOAD HISTORY
  // =====================================================

  async function loadHistory() {
    // Get user's nickname
    const {
      data: user,
      error: userError,
    } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(
        "Profile load error:",
        userError
      );
    }

    if (user) {
      setNickname(
        user.nickname
      );
    }

    // Get bonus history
    const {
      data,
      error,
    } = await supabase
      .from("admin_bonus_history")
      .select(`
        *,
        admin:profiles!admin_bonus_history_admin_id_fkey(username)
      `)
      .eq("user_id", userId)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "History load error:",
        error
      );

      return;
    }

    setHistory(
      data || []
    );
  }

  // =====================================================
  // START EDITING
  // =====================================================

  function startEdit(item) {
    if (!isCreator) {
      return;
    }

    setEditingId(
      item.id
    );

    setEditPoints(
      String(item.points ?? 0)
    );

    setEditReason(
      item.reason || ""
    );
  }

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  function cancelEdit() {
    setEditingId(null);
    setEditPoints("");
    setEditReason("");
  }

  // =====================================================
  // SAVE EDIT
  // =====================================================

  async function saveEdit(item) {
    if (!isCreator) {
      alert(
        "Зөвхөн Creator засах боломжтой."
      );

      return;
    }

    const newPoints =
      Number(editPoints);

    if (
      Number.isNaN(
        newPoints
      )
    ) {
      alert(
        "Оноо зөв тоо байх ёстой."
      );

      return;
    }

    if (
      !editReason.trim()
    ) {
      alert(
        "Шалтгаан хоосон байж болохгүй."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Энэ бонус түүхийг засах уу?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setSavingEdit(true);

      const {
        error,
      } = await supabase
        .from(
          "admin_bonus_history"
        )
        .update({
          points:
            newPoints,

          reason:
            editReason.trim(),
        })
        .eq(
          "id",
          item.id
        );

      if (error) {
        throw error;
      }

      setHistory(
        (current) =>
          current.map(
            (historyItem) =>
              historyItem.id ===
              item.id
                ? {
                    ...historyItem,

                    points:
                      newPoints,

                    reason:
                      editReason.trim(),
                  }
                : historyItem
          )
      );

      cancelEdit();

      alert(
        "Бонус түүх амжилттай засагдлаа."
      );
    } catch (err) {
      console.error(
        "Edit bonus history error:",
        err
      );

      alert(
        `Засахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // =====================================================
  // DELETE HISTORY ROW
  // =====================================================

  async function deleteHistory(item) {
    if (!isCreator) {
      alert(
        "Зөвхөн Creator устгах боломжтой."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Энэ бонус түүхийг бүр мөсөн устгах уу?\n\n` +
        `Оноо: ${item.points}\n` +
        `Шалтгаан: ${item.reason}`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        item.id
      );

      const {
        error,
      } = await supabase
        .from(
          "admin_bonus_history"
        )
        .delete()
        .eq(
          "id",
          item.id
        );

      if (error) {
        throw error;
      }

      setHistory(
        (current) =>
          current.filter(
            (historyItem) =>
              historyItem.id !==
              item.id
          )
      );

      if (
        editingId ===
        item.id
      ) {
        cancelEdit();
      }

      alert(
        "Бонус түүх устгагдлаа."
      );
    } catch (err) {
      console.error(
        "Delete bonus history error:",
        err
      );

      alert(
        `Устгахад алдаа гарлаа:\n${err.message}`
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 700,
          margin:
            "40px auto",
          padding: 20,
        }}
      >
        <p>
          Түүх ачаалж байна...
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
        maxWidth: 700,
        margin:
          "40px auto",
        padding: 20,
      }}
    >
      <button
        onClick={() =>
          navigate(-1)
        }
      >
        🔙 Буцах
      </button>

      <h1
        style={{
          marginTop: 20,
        }}
      >
        📜 {nickname} хэрэглэгчийн бонус оноо
      </h1>

      <p>
        2026-08-01 ээс хойш өгсөн бонус оноо ийшээ орж байгаа болно.
      </p>

      {isCreator && (
        <div
          style={{
            padding: 10,
            marginBottom: 15,
            backgroundColor:
              "#f3e8ff",
            border:
              "1px solid #c084fc",
            borderRadius: 8,
          }}
        >
          👑 Creator: Та бонус түүхийг засах болон устгах боломжтой.
        </div>
      )}

      {history.length ===
      0 ? (
        <p>
          Бонус оноо одоохондоо аваагүй байна.
        </p>
      ) : (
        history.map(
          (item) => (
            <div
              key={
                item.id
              }
              style={{
                border:
                  "1px solid #ddd",

                borderRadius:
                  10,

                padding:
                  15,

                marginTop:
                  15,
              }}
            >
              {editingId ===
              item.id ? (
                <>
                  <label>
                    <strong>
                      Оноо
                    </strong>
                  </label>

                  <input
                    type="number"
                    value={
                      editPoints
                    }
                    onChange={(
                      e
                    ) =>
                      setEditPoints(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",

                      padding:
                        8,

                      marginTop:
                        5,

                      marginBottom:
                        12,

                      boxSizing:
                        "border-box",
                    }}
                  />

                  <label>
                    <strong>
                      Шалтгаан
                    </strong>
                  </label>

                  <textarea
                    value={
                      editReason
                    }
                    onChange={(
                      e
                    ) =>
                      setEditReason(
                        e.target.value
                      )
                    }
                    rows={4}
                    style={{
                      width:
                        "100%",

                      padding:
                        8,

                      marginTop:
                        5,

                      marginBottom:
                        12,

                      boxSizing:
                        "border-box",
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
                      marginRight:
                        8,

                      backgroundColor:
                        "#28a745",

                      color:
                        "white",

                      border:
                        "none",

                      borderRadius:
                        5,

                      padding:
                        "7px 12px",

                      cursor:
                        savingEdit
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {savingEdit
                      ? "Хадгалж байна..."
                      : "💾 Хадгалах"}
                  </button>

                  <button
                    onClick={
                      cancelEdit
                    }
                    disabled={
                      savingEdit
                    }
                    style={{
                      padding:
                        "7px 12px",

                      borderRadius:
                        5,

                      cursor:
                        "pointer",
                    }}
                  >
                    ❌ Болих
                  </button>
                </>
              ) : (
                <>
                  <h3>
                    {item.points >=
                    0
                      ? `+${item.points} оноо`
                      : `${item.points} оноо`}
                  </h3>

                  <p>
                    <strong>
                      Админ:
                    </strong>{" "}
                    {item.admin
                      ?.username ||
                      "Unknown"}
                  </p>

                  <p>
                    <strong>
                      Шалтгаан:
                    </strong>{" "}
                    {item.reason}
                  </p>

                  <p>
                    <strong>
                      Огноо:
                    </strong>{" "}
                    {new Date(
                      item.created_at
                    ).toLocaleString()}
                  </p>

                  {isCreator && (
                    <div
                      style={{
                        marginTop:
                          12,

                        display:
                          "flex",

                        gap:
                          8,
                      }}
                    >
                      <button
                        onClick={() =>
                          startEdit(
                            item
                          )
                        }
                        style={{
                          backgroundColor:
                            "#ffc107",

                          color:
                            "black",

                          border:
                            "none",

                          borderRadius:
                            5,

                          padding:
                            "7px 12px",

                          cursor:
                            "pointer",
                        }}
                      >
                        ✏️ Засах
                      </button>

                      <button
                        onClick={() =>
                          deleteHistory(
                            item
                          )
                        }
                        disabled={
                          deletingId ===
                          item.id
                        }
                        style={{
                          backgroundColor:
                            "#dc3545",

                          color:
                            "white",

                          border:
                            "none",

                          borderRadius:
                            5,

                          padding:
                            "7px 12px",

                          cursor:
                            deletingId ===
                            item.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {deletingId ===
                        item.id
                          ? "Устгаж байна..."
                          : "🗑️ Устгах"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )
        )
      )}
    </div>
  );
}