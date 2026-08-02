import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminBonusHistoryPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    // Get user's nickname
    const { data: user } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .single();

    if (user) setNickname(user.nickname);

    // Get bonus history
    const { data, error } = await supabase
      .from("admin_bonus_history")
      .select(`
        *,
        admin:profiles!admin_bonus_history_admin_id_fkey(username)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setHistory(data);
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 20 }}>
      <button onClick={() => navigate(-1)}>
        🔙 Буцах
      </button>

      <h1 style={{ marginTop: 20 }}>
        📜 {nickname} хэрэглэгчийн бонус оноо
      </h1>
      <p>2026-08-01 ээс хойш өгсөн бонус оноо ийшээ орж байгаа болно.</p>

      {history.length === 0 ? (
        <p>Бонус оноо одоохондоо аваагүй байна.</p>
      ) : (
        history.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
              marginTop: 15,
            }}
          >
            <h3>
              {item.points >= 0
                ? `+${item.points} оноо`
                : `${item.points} оноо`}
            </h3>

            <p>
              <strong>Админ:</strong>{" "}
              {item.admin?.username}
            </p>

            <p>
              <strong>Шалтгаан:</strong>{" "}
              {item.reason}
            </p>

            <p>
              <strong>Огноо:</strong>{" "}
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}