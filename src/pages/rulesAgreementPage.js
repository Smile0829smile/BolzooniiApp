import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function RulesAgreementPage() {
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const handleAgree = async () => {
    await supabase
      .from('profiles')
      .update({ agreed_to_rules: true })
      .eq('id', userId);
    navigate('/');
  };

  const handleDisagree = async () => {
    alert("Та дүрмийг зөвшөөрөөгүй тул ашиглах боломжгүй.");
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>📜 Грүппийн Үндсэн Дүрэм</h2>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f9f9f9', padding: 20, borderRadius: 10, maxHeight: 500, overflowY: 'auto' }}>
{`Грүппийн Үндсэн дүрэм

Зөрчвөл хэр аймар зөрчсөнөөс нь хамаараад 1 анхааруулга өгнө 
Нэг анхааруулга авсандаа дургүй байвал шүүлтэнд дуудаж болно
3 анхааруулга авбал грүппээс хөөнө! Эсвэл онооноос нь 50 ийг хасна.

ЭНГИЙН ДҮРМҮҮД
1. Хараал хэлж болно гэхдээ бүүр аймар2 хараал хэлэхгүй.
2. Хэрүүл өдөөхгүй тайван байх.
3. Сонин2 +18 эдр ярихгүй байх.
4. Хүний эрхэнд халдахгүй байх.
5. Нэгнийгээ араар нь муулахгүй байх.

БОЛЗОЖ БАЙХ ҮЕИЙН ЗҮЙЛС
1. Болзооны даалгавраа биелүүлээгүй байж болзоогоо дуусгах.
2. Болзож байгаа хүндээ сэтгэлээсээ хандах.

РЕПОРТТОЙ ХОЛБООТ ДҮРМҮҮД
1. Санаандаггүй репортлочихлоо гэвэл -1 christma.
2. Худлаа тоглож репорт явуулсан бол -3 christma.
3. Хэрэв чи өөрийнхөө буруугаас болж репортлуулвал 1 анхааруулга.
4. Репорт баталгаа нь грүпп дээр байх ёстой.
5. Репортлуулсан бол янз бүр болохгүй.

БАН-ТАЙ ХОЛБООТОЙ ДҮРМҮҮД
1. Бандуулсан бол тийрэхгүй шүү.
2. Эхний гурав нэг удаадаа 3 даалгавар л өгч болно.
3. Даалгавар өгөхдөө +18 эдр өгөхгүй.
4. 24 цагийн дараа автоматаар гарна.

ЭХНИЙ ГУРВЫН АШИГУУД
1. Болзооны санал дамжуулахад 10 оноо.
2. Эхний гурав тусдаа грүпптэй.
3. Бие даан бандаж болно.
4. Даалгавар өгөхдөө заавал зөвшилцөх албагүй.
5. Хамтарч хүн хөөж болно — cooldown 7 хоног.
6. Болзоо санал оруулах боломжтой.

ХҮН НЭМЭХДЭЭ
1. Грүппийн учрыг тайлбарлаж нэмнэ.
2. Нэмэх хүн нь Web дээр бүртгүүлэх.
3. Энэ дүрмүүдийг заавал уншуулах.`}
      </pre>
      <div style={{ marginTop: 20 }}>
        <button onClick={handleAgree} style={{ marginRight: 10 }}>✅ Би зөвшөөрч байна</button>
        <button onClick={handleDisagree}>❌ Зөвшөөрөхгүй</button>
      </div>
    </div>
  );
}
