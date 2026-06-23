import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ShiftScreen() {
  const [alarm, setAlarm] = useState<HTMLAudioElement | null>(null);
  const playAlarm = () => {
    const audio = new Audio("/siren.mp3");

    audio.loop = true;
    audio.volume = 1;

    audio.play().catch(console.log);

    setAlarm(audio);
  };

  const stopAlarm = () => {
    if (alarm) {
      alarm.pause();
      alarm.currentTime = 0;
      setAlarm(null);
    }
  };
  const [guardName, setGuardName] = useState("");
  const [guardNo, setGuardNo] = useState("");
  const [location, setLocation] = useState("");

  const [started, setStarted] = useState(false);

  const [timeLeft, setTimeLeft] = useState(1800);

  const [showChallenge, setShowChallenge] = useState(false);

  const [targetColor, setTargetColor] = useState("RED");

  const [challengeTimeLeft, setChallengeTimeLeft] = useState(180);

  const [totalAlerts, setTotalAlerts] = useState(0);
  const [responded, setResponded] = useState(0);
  const [missed, setMissed] = useState(0);

  const [reports, setReports] = useState<any[]>([]);

  const addReport = (reason: string) => {
    setReports((prev) => [
      ...prev,
      {
        serialNo: prev.length + 1,
        guardName,
        guardNo,
        location,
        reason,
        date: new Date().toLocaleString(),
      },
    ]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!started || showChallenge) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTotalAlerts((v) => v + 1);

          const colors = ["RED", "BLUE", "GREEN"];
          setTargetColor(colors[Math.floor(Math.random() * colors.length)]);

          setChallengeTimeLeft(180);
          setShowChallenge(true);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, showChallenge]);

  useEffect(() => {
    if (!showChallenge) return;

    const timer = setInterval(() => {
      setChallengeTimeLeft((prev) => {
        if (prev <= 1) {
          setMissed((v) => v + 1);

          addReport("Challenge Timeout");

          setShowChallenge(false);
          setTimeLeft(1800);

          return 180;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showChallenge]);

  if (showChallenge) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Tap {targetColor}
        </Text>

        <Text
          style={{
            fontSize: 20,
            color: "red",
            marginBottom: 30,
          }}
        >
          Time Left: {formatTime(challengeTimeLeft)}
        </Text>

        <TouchableOpacity
          onPress={() => {
            if (targetColor === "RED") {
              setResponded((v) => v + 1);
              addReport("Responded");
            } else {
              setMissed((v) => v + 1);
              addReport("Wrong Color");
            }

            setShowChallenge(false);
            setTimeLeft(1800);
          }}
          style={{
            backgroundColor: "red",
            width: 220,
            padding: 20,
            marginBottom: 10,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            RED
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (targetColor === "BLUE") {
              setResponded((v) => v + 1);
              addReport("Responded");
            } else {
              setMissed((v) => v + 1);
              addReport("Wrong Color");
            }

            setShowChallenge(false);
            setTimeLeft(1800);
          }}
          style={{
            backgroundColor: "blue",
            width: 220,
            padding: 20,
            marginBottom: 10,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            BLUE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (targetColor === "GREEN") {
              setResponded((v) => v + 1);
              addReport("Responded");
            } else {
              setMissed((v) => v + 1);
              addReport("Wrong Color");
            }

            setShowChallenge(false);
            setTimeLeft(1800);
          }}
          style={{
            backgroundColor: "green",
            width: 220,
            padding: 20,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            GREEN
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (started) {
    return (
      <ScrollView
        contentContainerStyle={{
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          Shift Active
        </Text>

        <Text style={{ fontSize: 18 }}>Guard: {guardName}</Text>

        <Text style={{ fontSize: 18 }}>Guard No: {guardNo}</Text>

        <Text
          style={{
            fontSize: 18,
            marginBottom: 20,
          }}
        >
          Location: {location}
        </Text>

        <Text
          style={{
            fontSize: 34,
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          Next Alert In: {formatTime(timeLeft)}
        </Text>

        <Text style={{ fontSize: 18 }}>Total Alerts: {totalAlerts}</Text>

        <Text style={{ fontSize: 18 }}>Responded: {responded}</Text>

        <Text
          style={{
            fontSize: 18,
            marginBottom: 30,
          }}
        >
          Missed: {missed}
        </Text>

        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Reports
        </Text>

        {reports.map((item) => (
          <View
            key={item.serialNo}
            style={{
              borderWidth: 1,
              padding: 10,
              marginBottom: 10,
              borderRadius: 8,
            }}
          >
            <Text>SR: {item.serialNo}</Text>
            <Text>Name: {item.guardName}</Text>
            <Text>No: {item.guardNo}</Text>
            <Text>Location: {item.location}</Text>
            <Text>Reason: {item.reason}</Text>
            <Text>Date: {item.date}</Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => {
            setStarted(false);
          }}
          style={{
            backgroundColor: "red",
            padding: 15,
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            End Shift
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 30,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Start Shift
      </Text>

      <TextInput
        placeholder="Guard Name"
        value={guardName}
        onChangeText={setGuardName}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Guard Number"
        value={guardNo}
        onChangeText={setGuardNo}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginBottom: 15,
        }}
      />

      <TextInput
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
        style={{
          borderWidth: 1,
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        onPress={() => {
          if (!guardName || !guardNo || !location) {
            alert("Please fill all fields");
            return;
          }

          setStarted(true);
        }}
        style={{
          backgroundColor: "green",
          padding: 15,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: "white",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          Start Shift
        </Text>
      </TouchableOpacity>
    </View>
  );
}
