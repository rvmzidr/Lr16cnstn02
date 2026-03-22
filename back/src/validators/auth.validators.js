const { z, booleanField, cleanString } = require("./common");
const { createMemberDossierSchema } = require("./member-record.validators");

const inscriptionBodySchema = createMemberDossierSchema({
  includeEmailInstitutionnel: true,
})
  .extend({
    motDePasse: z.string().min(8).max(128),
    confirmationMotDePasse: z.string().min(8).max(128),
    conditionsAcceptees: booleanField().refine((value) => value === true, {
      message: "Les conditions d'utilisation doivent etre acceptees.",
    }),
  })
  .refine((data) => data.motDePasse === data.confirmationMotDePasse, {
    path: ["confirmationMotDePasse"],
    message: "La confirmation du mot de passe ne correspond pas.",
  });

const connexionBodySchema = z.object({
  emailInstitutionnel: z.string().trim().email(),
  motDePasse: z.string().min(8).max(128),
});

const motDePasseOublieBodySchema = z.object({
  emailInstitutionnel: z.string().trim().email(),
});

const reinitialisationMotDePasseBodySchema = z
  .object({
    token: cleanString(2000),
    nouveauMotDePasse: z.string().min(8).max(128),
    confirmationMotDePasse: z.string().min(8).max(128),
  })
  .refine(
    (data) => data.nouveauMotDePasse === data.confirmationMotDePasse,
    {
      path: ["confirmationMotDePasse"],
      message: "La confirmation du mot de passe ne correspond pas.",
    }
  );

module.exports = {
  inscriptionBodySchema,
  connexionBodySchema,
  motDePasseOublieBodySchema,
  reinitialisationMotDePasseBodySchema,
};
