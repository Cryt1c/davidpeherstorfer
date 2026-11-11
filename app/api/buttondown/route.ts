import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    const API_KEY = process.env.BUTTONDOWN_API_KEY
    const buttondownRoute = `${process.env.BUTTONDOWN_API_URL}subscribers`
    const response = await fetch(buttondownRoute, {
      body: JSON.stringify({
        email,
      }),
      headers: {
        Authorization: `Token ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    if (response.status >= 400) {
      return NextResponse.json(
        { error: `There was an error subscribing to the list.` },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: '' }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message || error.toString() }, { status: 500 })
  }
}
