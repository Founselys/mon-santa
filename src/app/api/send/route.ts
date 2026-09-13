import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { emails } = await req.json();

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
      ? (process.env.NEXT_PUBLIC_SITE_URL.startsWith('http') ? process.env.NEXT_PUBLIC_SITE_URL : `https://${process.env.NEXT_PUBLIC_SITE_URL}`)
      : 'http://localhost:3000';

    const results = [];

    for (const emailData of emails) {
      // On ignore targetName dans le mail pour garder l'effet de surprise
      const { to, name, groupName, groupId, participantId } = emailData;

      const magicLink = `${baseUrl}/wishlist/${groupId}?p=${participantId}`;

      const { data, error } = await resend.emails.send({
        from: 'SantApp <contact@founselys.com>',
        to: [to],
        subject: `🎁 Ton tirage Secret Santa pour ${groupName} est prêt !`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #0f172a; max-width: 500px; margin: 0 auto; border: 4px solid #0f172a; border-radius: 24px; background-color: #ffffff;">
            <h2 style="font-size: 28px; font-weight: 900; font-style: italic; text-transform: uppercase; margin-top: 0;">Salut ${name} ! 🎅</h2>
            
            <p style="font-size: 16px; font-weight: bold;">
              Le tirage au sort pour le groupe <strong style="color: #dc2626;">${groupName}</strong> a été effectué !
            </p>
            
            <div style="background-color: #fef08a; border: 3px solid #0f172a; border-radius: 16px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="font-size: 18px; font-weight: 900; margin: 0; color: #0f172a; font-style: italic; text-transform: uppercase;">
                🤫 Ton cadeau secret t'attend !
              </p>
              <p style="font-size: 13px; margin-top: 6px; margin-bottom: 0; color: #475569;">
                Clique sur le bouton ci-dessous pour déballer ton paquet et découvrir à qui tu dois offrir un cadeau.
              </p>
            </div>

            <a href="${magicLink}" style="display: block; background-color: #dc2626; color: #ffffff; padding: 18px 24px; border-radius: 16px; text-decoration: none; font-weight: 900; font-style: italic; text-align: center; font-size: 18px; border: 3px solid #0f172a;">
              DÉBALLER MON CADEAU 🎁
            </a>

            <p style="margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center;">
              Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br/>
              <a href="${magicLink}" style="color: #2563eb;">${magicLink}</a>
            </p>
          </div>
        `,
      });

      if (error) {
        console.error(`Erreur d'envoi Resend pour ${to} :`, error);
        results.push({ to, success: false, error });
      } else {
        results.push({ to, success: true, data });
      }
    }

    const hasErrors = results.some(r => !r.success);
    if (hasErrors) {
      const firstError = results.find(r => !r.success)?.error;
      return NextResponse.json({ 
        error: `Erreur d'envoi (ex: ${firstError?.message || 'Erreur inconnue'})` 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, results });
    
  } catch (error: any) {
    console.error("Erreur serveur globale API /api/send :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}