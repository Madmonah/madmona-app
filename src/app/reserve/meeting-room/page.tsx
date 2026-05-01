import { redirect } from 'next/navigation'

export default function ReserveMeetingRoomRedirect() {
  redirect('/marketplace?category=workspaces-meeting')
}
