import { DkimSigningAttributesFilterSensitiveLog, } from "./models_0";
export const PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SigningAttributes && { SigningAttributes: DkimSigningAttributesFilterSensitiveLog(obj.SigningAttributes) }),
});
