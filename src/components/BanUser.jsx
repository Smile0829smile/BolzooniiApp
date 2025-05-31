import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient"; // Adjust path if needed

export default function BanUser({ userIdToBan, currentUser, userRank }) {
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkBan() {
      if (!currentUser || !userIdToBan) return;

      const { data, error } = await supabase
        .from("bans")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("banned_user_id", userIdToBan)
        .single();

      if (data) setIsBanned(true);
      else setIsBanned(false);
    }
    checkBan();
  }, [currentUser, userIdToBan]);

  const canBan = userRank && userRank <= 3;

  async function handleBan() {
    if (!canBan) {
      alert("Only top 3 ranked users can ban.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("bans").insert({
      user_id: currentUser.id,
      banned_user_id: userIdToBan,
    });
    setLoading(false);
    if (error) alert("Failed to ban user: " + error.message);
    else setIsBanned(true);
  }

  async function handleUnban() {
    setLoading(true);
    const { error } = await supabase
      .from("bans")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("banned_user_id", userIdToBan);
    setLoading(false);
    if (error) alert("Failed to unban user: " + error.message);
    else setIsBanned(false);
  }

  return (
    <div>
      {canBan ? (
        isBanned ? (
          <button onClick={handleUnban} disabled={loading}>
            {loading ? "Unbanning..." : "Unban User"}
          </button>
        ) : (
          <button onClick={handleBan} disabled={loading}>
            {loading ? "Banning..." : "Ban User"}
          </button>
        )
      ) : (
        <p>Only top 3 ranked users can ban others.</p>
      )}
    </div>
  );
}
