export function isPasswordStrong(password: string): boolean {
  // Minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character
  const lengthRequirement = /.{8,}/;
  const uppercaseRequirement = /[A-Z]/;
  const lowercaseRequirement = /[a-z]/;
  const digitRequirement = /[0-9]/;
  const specialCharRequirement = /[!@#$%^&*(),.?\":{}|<>]/;
  return (
    lengthRequirement.test(password) &&
    uppercaseRequirement.test(password) &&
    lowercaseRequirement.test(password) &&
    digitRequirement.test(password) &&
    specialCharRequirement.test(password)
  );
}
