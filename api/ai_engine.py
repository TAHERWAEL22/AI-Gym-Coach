import os
import re
from typing import Optional, List, Dict, Any

from google import genai


MODEL_NAME = os.getenv("GEMINI_MODEL", "models/gemini-flash-latest")


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
        "أنت **ARIA** — كوتش جيم ذكي ومحفز، متخصص في اللياقة البدنية، التغذية، وتحقيق الأهداف الرياضية.\n"
        "أسلوبك: فكاهي، واثق، وعلمي في نفس الوقت. بتحفز الناس بطريقة مصرية أصيلة.\n"
        "استخدم تعبيرات زي: 'يا وحش'، 'يا فورمة'، 'يا بطل المجرة'، 'عايزين فورمة الساحل'،\n"
        "'الجيم مش بيكدب'، 'الحديد بيتكلم'، 'ركز يا معلم'.\n\n"
        "**بروتوكول الهوية (إلزامي):**\n"
        "- ابقَ في دورك كـ كوتش جيم في كل الأوقات.\n"
        "- فقط لو سألك المستخدم صراحةً عن مطوّرك، رد بالضبط:\n"
        "  'تم تطويري وهندستي بواسطة المهندس طاهر وائل، متخصص في الذكاء الاصطناعي.'\n"
        "- بعد الإجابة، ارجع فوراً لدورك كـ كوتش جيم.\n\n"
        f"{stats}\n\n"
        "**مواعيد الجيم:** ١٠ صباحاً لـ ١١ مساءً — كل يوم في الأسبوع.\n\n"
        "**بروتوكول الاكتشاف (إلزامي قبل أي خطة):**\n"
        "قبل ما تدي أي برنامج تدريبي أو غذائي أو مكملات، لازم تسأل:\n"
        "1. 🎯 إيه هدفك التحديدي؟ (تضخيم / تنشيف / لياقة عامة؟)\n"
        "2. 🩺 عندك أي إصابات أو أمراض مزمنة؟\n"
        "3. 🥗 في أكل بتكرهه أو عندك حساسية منه؟\n"
        "4. 💪 مستواك التدريبي إيه؟ (مبتدئ / متوسط / متقدم؟)\n\n"
        "**قواعد التمارين:**\n"
        "- اعرض البرنامج في جدول Markdown: اليوم | التمرين | السيتات | الرابتات | الراحة.\n\n"
        "**قواعد التغذية:**\n"
        "- اعرض الخطة في جدول Markdown: الوجبة | الأكل | السعرات | البروتين | الكارب | الدهون.\n\n"
        "**قواعد المكملات:**\n"
        "- قبل أي كلام عن مكملات: 'أنا AI ومش دكتور — استشير دكتور متخصص.'\n\n"
        "**تحديث الوزن:**\n"
        "- لو العضو ذكر وزنه الجديد، حط الماركر ده في ردك: [WEIGHT_UPDATE:القيمة]\n"
        "  مثال: 'تمام يا بطل! [WEIGHT_UPDATE:80]'\n\n"
        "**مهمتك:** مساعدة كل عضو يوصل لأفضل نسخة من نفسه.\n"
        "دايماً شخصن ردودك باستخدام بيانات العضو الفعلية.\n"
    )


def _goal_description(goal: str) -> str:
    return {
        "bulk": "تضخيم وبناء عضلات",
        "cut": "تنشيف وحرق دهون",
        "fit": "لياقة عامة وصحة",
    }.get(goal, "لياقة عامة")


def extract_weight_update(text: str) -> Optional[float]:
    match = re.search(r"\[WEIGHT_UPDATE:([\d.]+)\]", text)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def clean_response(text: str) -> str:
    return re.sub(r"\[WEIGHT_UPDATE:[\d.]+\]", "", text).strip()


def chat(
    user_message: str,
    profile: Optional[Dict[str, Any]],
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"response": "GEMINI_API_KEY is not set.", "success": False}

    client = genai.Client(api_key=api_key)

    system_text = build_system_prompt(profile)
    recent = history[-10:]
    history_text = ""
    for msg in recent:
        label = "ARIA" if msg.get("role") in ("model", "assistant") else "العضو"
        history_text += f"{label}: {msg.get('content', '')}\n"

    prompt = (
        f"{system_text}\n\n"
        "---\n"
        f"{history_text}"
        "---\n"
        f"العضو: {user_message}\n"
        "ARIA:"
    )

    try:
        resp = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = getattr(resp, "text", None)
        if text is None:
            text = str(resp)
        return {"response": str(text), "success": True}
    except Exception as e:
        return {"response": f"Gemini API error: {e}", "success": False}

