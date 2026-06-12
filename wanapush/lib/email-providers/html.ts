// Wrapper HTML responsive pour les campagnes envoyées via un provider externe.
// IMPORTANT : la désinscription est gérée par le fournisseur (Brevo) via son tag
// `{{ unsubscribe }}` — on NE met PAS de lien WanaPush ici (ce serait en doublon
// et non conforme au flux du fournisseur). Brevo remplace le tag + pose les
// en-têtes List-Unsubscribe (RFC 8058) automatiquement.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function wrapProviderCampaignHtml(params: {
  contentHtml: string;
  fromName: string;
  preheader?: string;
}): string {
  const preheaderHtml = params.preheader
    ? `<div style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(params.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title></title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
${preheaderHtml}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
  <tr>
    <td align="center" style="padding:32px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:8px">
        <tr><td style="padding:32px">${params.contentHtml}</td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.6">
          ${escapeHtml(params.fromName)}<br>
          Vous recevez cet email car vous êtes inscrit·e à notre liste.
          <a href="{{ unsubscribe }}" style="color:#6b7280;text-decoration:underline">Se désabonner</a>.
        </td></tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
