import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { emails } = await req.json();

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? (process.env.NEXT_PUBLIC_SITE_URL.startsWith('http') ? process.env.NEXT_PUBLIC_SITE_URL : `https://${process.env.NEXT_PUBLIC_SITE_URL}`)
      : 'http://localhost:3000';

    for (const emailData of emails) {
      const { to, name, targetName, groupName, groupId, participantId } = emailData;

      const magicLink = `${baseUrl}/wishlist/${groupId}?p=${participantId}`;

      await resend.emails.send({
        from: 'SantApp <onboarding@resend.dev>',
        to: [to],
        subject: `🎅 Ton tirage Secret Santa pour ${groupName} !`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2>Salut ${name} ! 🎅</h2>
            <p>Le tirage au sort pour le groupe <strong>${groupName}</strong> a été effectué !</p>
            <p style="font-size: 18px; margin: 20px 0;">
              Tu dois offrir un cadeau à : <strong style="color: #dc2626;">${targetName}</strong> 🎁
            </p>
            <p>Clique sur le bouton ci-dessous pour voir sa liste de cadeaux et discuter dans le chat anonyme :</p>
            <a href="${magicLink}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 10px;">
              ACCÉDER À MON ESPACE SECRET 🎄
            </a>
            <p style="margin-top: 30px; font-size: 12px; color: #64748b;">
              Si le bouton ne fonctionne pas, copie ce lien : <br/>
              <a href="${magicLink}">${magicLink}</a>
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}