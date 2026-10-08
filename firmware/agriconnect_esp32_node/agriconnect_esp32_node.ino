#define BUZZER_PIN 26

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  delay(1000);

  digitalWrite(BUZZER_PIN, HIGH);
  delay(3000);

  digitalWrite(BUZZER_PIN, LOW);
}

void loop() {
}