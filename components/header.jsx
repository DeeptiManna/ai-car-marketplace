import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import React from 'react'

const header = () => {
  return (
    <div>
     <SignedOut>
              <SignInButton/>
              <SignUpButton>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
    </div>
  )
}

export default header
