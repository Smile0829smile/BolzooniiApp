import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminBonusPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, nickname, christma_points")
      .eq("id", userId)
      .single();

    if (!error) {
      setProfile(data);
    }
  }

  async function handleSend() {
    if (amount === "" || isNaN(Number(amount))) {
      alert("Онооны хэмжээг зөв оруулна уу.");
      return;
    }
  
    if (reason.trim() === "") {
      alert("Шалтгаанаа бичнэ үү.");
      return;
    }
  
    // Get logged-in admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    const { data: admin } = await supabase
      .from("profiles")
      .select("id, username, nickname, is_admin")
      .eq("id", user.id)
      .single();
  
    if (!admin?.is_admin) {
      alert("Зөвхөн админ ашиглах боломжтой.");
      return;
    }
  
    const change = Number(amount);
    const newPoints = Math.max(0, profile.christma_points + change);
  
    // Update points
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        christma_points: newPoints,
      })
      .eq("id", profile.id);
  
    if (updateError) {
      alert("Point update failed.");
      console.error(updateError);
      return;
    }
  
    // Save history
    const { error: historyError } = await supabase
      .from("admin_bonus_history")
      .insert({
        user_id: profile.id,
        admin_id: admin.id,
        points: change,
        reason: reason,
      });
  
      if (historyError) {
        console.error(historyError);
        alert(JSON.stringify(historyError, null, 2));
        return;
      }
  
    // Notification
    const message =
      change >= 0
        ? `${admin.username} админ ${
            profile.username
          }-д +${change} оноо өглөө.\n\nШалтгаан:\n${reason}`
        : `${admin.username} админ ${
            profile.username
          }-оос ${Math.abs(change)} оноо хаслаа.\n\nШалтгаан:\n${reason}`;
  
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: null,
        message,
      });
  
    if (notificationError) {
      console.error(notificationError);
    }
  
    alert("Амжилттай!");
  
    navigate("/");
  }

  if (!profile) return <p>Loading...</p>;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 20
      }}
    >
      <button onClick={() => navigate(-1)}>
        🔙 Буцах
      </button>

      <h1>🎁 Бонус оноо</h1>

      <h3>{profile.username}</h3>

      <p>
        Одоогийн оноо: <b>{profile.christma_points}</b>
      </p>
      <p>
        Бонусын дараа:{" "}
        <b>
            {Math.max(
            0,
            profile.christma_points + (Number(amount) || 0)
            )}
        </b>
      </p>

      <div style={{ marginTop: 20 }}>
        <label>Хэмжээ</label>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Энд хэдийг нэмэх эсвэл хасахаа оруулна уу"
          style={{
            width: "100%",
            padding: 10,
            marginTop: 5,
            marginBottom: 20
          }}
        />
      </div>

      <div>
        <label>Reason</label>

        <textarea
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Оноо өгж байгаа шалтгаан?"
          style={{
            width: "100%",
            padding: 10,
            marginTop: 5
          }}
        />
      </div>

      <button
        onClick={handleSend}
        style={{
          marginTop: 25,
          width: "100%",
          padding: 12,
          fontSize: 18
        }}
      >
        ӨГӨХ
      </button>
    </div>
  );
}