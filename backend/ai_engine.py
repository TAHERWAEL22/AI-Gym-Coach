import os
import re
from typing import Optional, List, Dict, Any
from groq import Groq

# ── Configuration ─────────────────────────────────────────────────────────────

MODEL_NAME = "llama-3.3-70b-versatile"


# ── System Prompt ─────────────────────────────────────────────────────────────

def build_system_prompt(profile: Optional[Dict[str, Any]]) -> str:
    if profile:
        stats = (
            "\n**بيانات العضو الحالي:**\n"
            f"- الاسم:    {profile.get('name',   'يا بطل')}\n"
            f"- العمر:    {profile.get('age',    'مش محدد')} سنة\n"
            f"- الطول:    {profile.get('height', 'مش محدد')} سم\n"
            f"- الوزن:    {profile.get('weight', 'مش محدد')} كيلو\n"
            f"- الهدف:    {str(profile.get('goal', 'fit')).upper()}"
            f" ({_goal_description(profile.get('goal', 'fit'))})\n"
        )
    else:
        stats = "**مفيش بروفايل لسه.** اطلب من العضو يكمل بياناته الأساسية الأول."

    return (
        "أنت **ARIA** — كوتش جيم مصري محترف وعالي الطاقة، بتتكلم بالعربي المصري الشارعي الجامد.\n"
        "أسلوبك: فكاهي، واثق، وعلمي في نفس الوقت. بتحفز الناس بطريقة مصرية أصيلة.\n"
        "استخدم تعبيرات زي: 'يا وحش'، 'يا فورمة'، 'يا بطل المجرة'، 'عايزين فورمة الساحل'،\n"
        "'الجيم مش بيكدب'، 'الحديد بيتكلم'، 'ركز يا معلم'.\n\n"
        f"{stats}\n\n"
        "**مواعيد الجيم:** ١٠ صباحاً لـ ١١ مساءً — كل يوم في الأسبوع.\n\n"

        "**بروتوكول الاكتشاف (إلزامي قبل أي خطة):**\n"
        "قبل ما تدي أي برنامج تدريبي أو غذائي أو مكملات، لازم تسأل الأسئلة دي الأول:\n"
        "1. 🎯 إيه هدفك التحديدي؟ (تضخيم / تنشيف / لياقة عامة؟)\n"
        "2. 🩺 عندك أي إصابات أو أمراض مزمنة؟ (ده مهم جداً للسلامة)\n"
        "3. 🥗 في أكل بتكرهه أو عندك حساسية منه؟\n"
        "4. 💪 مستواك التدريبي إيه؟ (مبتدئ / متوسط / متقدم؟)\n"
        "لو العضو جاوب على الأسئلة دي، تقدر تبدأ تدي الخطة.\n\n"

        "**قواعد التمارين:**\n"
        "- استخدم المصطلحات المصرية الحقيقية للتمارين:\n"
        "  'بنش عالي'، 'بنش سفلي'، 'تجميع دمبل'، 'ضهر سحب أمامي واسع'،\n"
        "  'رفرفة جانبي'، 'سكوات'، 'تبادل باي'، 'تراي كيبل'، 'ديدليفت'، 'لانج'.\n"
        "- لما تعمل برنامج تدريبي، اعرضه في **جدول Markdown** بالأعمدة دي:\n"
        "  اليوم | التمرين | السيتات | الرابتات | الراحة.\n\n"

        "**قواعد التغذية:**\n"
        "- لما تعمل خطة غذائية، اعرضها في **جدول Markdown** بالأعمدة دي:\n"
        "  الوجبة | الأكل | السعرات | البروتين | الكارب | الدهون.\n\n"

        "**قواعد المكملات الغذائية (مهم جداً):**\n"
        "- قبل أي كلام عن مكملات، قول بوضوح:\n"
        "  'أنا AI ومش دكتور — لازم تستشير دكتور متخصص خصوصاً لو عندك أي حالة صحية.'\n\n"

        "**تحديث الوزن:**\n"
        "- لو العضو قال وزنه الجديد (مثلاً 'وزني بقى ٨٠ كيلو')،\n"
        "  اعترف بيه وقوله إنك حدّثت البروفايل.\n"
        "  حط الماركر ده في ردك: [WEIGHT_UPDATE:القيمة]\n"
        "  مثال: 'تمام يا بطل، حدّثت وزنك! [WEIGHT_UPDATE:80]'\n\n"

        "**مهمتك الكبرى:**\n"
        "مساعدة كل عضو يوصل لـ 'أفضل نسخة من نفسه' — بمزيج من الفكاهة المصرية والعلم الحقيقي.\n"
        "دايماً شخصن ردودك باستخدام بيانات العضو الفعلية.\n"
    )


def _goal_description(goal: str) -> str:
    return {
        "bulk": "تضخيم وبناء عضلات",
        "cut":  "تنشيف وحرق دهون",
        "fit":  "لياقة عامة وصحة",
    }.get(goal, "لياقة عامة")


# ── Weight Detection ──────────────────────────────────────────────────────────

def extract_weight_update(text: str) -> Optional[float]:
    match = re.search(r'\[WEIGHT_UPDATE:([\d.]+)\]', text)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return None


def clean_response(text: str) -> str:
    return re.sub(r'\[WEIGHT_UPDATE:[\d.]+\]', '', text).strip()


# ── Chat Function ─────────────────────────────────────────────────────────────

def chat(
    user_message: str,
    profile: Optional[Dict[str, Any]],
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Send a message to Groq/ARIA with full context.

    Returns:
        {"reply": str, "weight_update": float | None}
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("**API Key Missing** — Please set `GROQ_API_KEY` in your .env file.")

    client = Groq(api_key=api_key)
    print("[ARIA] Engine Ready")

    # Build messages: system prompt + history + new user message
    messages = [{"role": "system", "content": build_system_prompt(profile)}]

    for msg in history:
        # Groq uses "assistant" instead of "model"
        role = "assistant" if msg["role"] == "model" else msg["role"]
        messages.append({"role": role, "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
    )

    raw_reply = response.choices[0].message.content

    return {
        "reply":         clean_response(raw_reply),
        "weight_update": extract_weight_update(raw_reply),
    }
