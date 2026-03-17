import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);
// CONFIGURATION DU DOMAINE OFFICIEL
const BASE_URL = "https://founselys.com"; 

export async function POST(req: Request) {
  try {
    const { emails } = await req.json();

    const results = await Promise.all(
      emails.map(async (emailData: any) => {
        // Construction du lien magique vers ton dossier [groupId]
        const magicLink = `${BASE_URL}/wishlist/${emailData.groupId}?p=${emailData.participantId}`;

        return resend.emails.send({
          from: 'Santa <santa@founselys.com>',
          to: emailData.to,
          subject: `Secret Santa : Ton tirage pour ${emailData.groupName} !`,
          html: `
            <div style="font-family: sans-serif; text-transform: uppercase; font-style: italic; font-weight: 900; text-align: center; padding: 20px;">
              <h1 style="color: #dc2626; font-size: 30px;">HO HO HO ${emailData.name} !</h1>
              <p style="font-size: 18px;">Le tirage au sort a été fait pour le groupe : <br/><strong>${emailData.groupName}</strong></p>
              <p style="font-size: 22px; margin: 30px 0;">Tu dois offrir un cadeau à : <br/><span style="color: #dc2626; font-size: 35px;">${emailData.targetName}</span></p>
              <br />
              <a href="${magicLink}" 
                 style="background-color: #dc2626; color: white; padding: 18px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-size: 18px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
                VOIR SA WISHLIST & REMPLIR LA MIENNE
              </a>
              <p style="margin-top: 40px; font-size: 10px; opacity: 0.5;">Lien personnel et sécurisé - founselys.com</p>
            </div>
          `
        });
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur envoi" }, { status: 500 });
  }
}