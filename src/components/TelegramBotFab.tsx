// TelegramBotFab — floating "chat with المارد on Telegram" button, shown on every page.
// Links to the Madmona Telegram bot. Sits above the mobile BottomNav (z-50 > z-40).
const BOT_URL = 'https://t.me/Madmona_bot'
const GENIE = 'https://res.cloudinary.com/duxfgqioc/image/upload/madmona/mascots/genie.png'

export default function TelegramBotFab() {
  return (
    <a
      href={BOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="كلّم مضمون على تليجرام"
      title="كلّم مضمون على تليجرام"
      className="fixed z-50 right-4 bottom-24 md:bottom-6 flex items-center gap-2 ps-1.5 pe-4 py-1.5 rounded-full text-white font-bold text-sm no-underline shadow-luxe ring-2 ring-white/60 hover:-translate-y-0.5 transition-transform"
      style={{ background: 'linear-gradient(90deg,#d4a017,#2FA084,#059669)' }}
    >
      <span className="w-9 h-9 rounded-full bg-white grid place-items-center overflow-hidden shrink-0">
        {/* plain img (avoids next/image domain config) */}
        <img src={GENIE} alt="" className="w-7 h-7 object-contain" />
      </span>
      <span>كلّم مضمون</span>
    </a>
  )
}
