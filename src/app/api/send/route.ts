import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = "https://founselys.com"; 

export async function POST(req: Request) {
  try {
    const { emails } = await req.json();

    const results = await Promise.all(
      emails.map(async (emailData: any) => {
        return resend.emails.send({
          from: 'Santa <santa@founselys.com>', // Configuré après validation DNS
          to: emailData.to,
          subject: `Secret Santa : Ton tirage pour ${emailData.groupName} !`,
          html: `
            <div style="font-family: sans-serif; text-transform: uppercase; font-style: italic; font-weight: 900; text-align: center;">
              <h1 style="color: #dc2626;">HO HO HO ${emailData.name} !</h1>
              <p>Le tirage au sort est prêt pour <strong>${emailData.groupName}</strong>.</p>
              <br />
              <a href="${BASE_URL}/wishlist/${emailData.participantId}" 
                 style="background-color: #dc2626; color: white; padding: 18px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 20px;">
                GERER MA LISTE
              </a>
              <p style="margin-top: 30px; font-size: 10px; opacity: 0.5;">Ceci est ton lien personnel, ne le partage pas.</p>
            </div>
          `
        });
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: "Erreur envoi" }, { status: 500 });
  }
}