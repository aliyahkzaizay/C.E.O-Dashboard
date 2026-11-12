import { useState } from 'react'
import CheckInSharePanel from '../components/CheckInSharePanel'
import { setCheckInOpen } from '../lib/checkinAPI'

export default function SharePanelDemo() {
  const token = 'open-token'            // try 'fail-token' to test the error path
  const [isOpen, setIsOpen] = useState(true)
  return (
    <CheckInSharePanel
      token={token}
      isOpen={isOpen}
      onSetOpen={async (open) => {
        const res = await setCheckInOpen(token, open)
        setIsOpen(res.is_open)          // only after the backend confirms
      }}
    />
  )
}