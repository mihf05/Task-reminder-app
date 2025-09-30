import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Task } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  let token: string | null = null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    const response = await Notifications.getExpoPushTokenAsync();
    token = response.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1a8e2d",
      });
    }

    return token;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

export async function scheduleTaskReminder(
  task: Task
): Promise<string | undefined> {
  if (!task.reminderEnabled) return;

  try {
    // Schedule notifications for each time
    for (const time of task.times) {
      const [hours, minutes] = time.split(":").map(Number);
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);

      // If time has passed for today, schedule for tomorrow
      if (today < new Date()) {
        today.setDate(today.getDate() + 1);
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Task Reminder",
          body: `Time to do ${task.name} (${task.description})`,
          data: { taskId: task.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      return identifier;
    }
  } catch (error) {
    console.error("Error scheduling task reminder:", error);
    return undefined;
  }
}

export async function scheduleRefillReminder(
  task: Task
): Promise<string | undefined> {
  if (!task.refillReminder) return;

  try {
    // Schedule a notification when supply is low
    if (task.currentSupply <= task.refillAt) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Refill Reminder",
          body: `Your ${task.name} supply is running low. Current supply: ${task.currentSupply}`,
          data: { taskId: task.id, type: "refill" },
        },
        trigger: null, // Show immediately
      });

      return identifier;
    }
  } catch (error) {
    console.error("Error scheduling refill reminder:", error);
    return undefined;
  }
}

export async function cancelTaskReminders(
  taskId: string
): Promise<void> {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      const data = notification.content.data as {
        taskId?: string;
      } | null;
      if (data?.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } catch (error) {
    console.error("Error canceling task reminders:", error);
  }
}

export async function updateTaskReminders(
  task: Task
): Promise<void> {
  try {
    // Cancel existing reminders
    await cancelTaskReminders(task.id);

    // Schedule new reminders
    await scheduleTaskReminder(task);
    await scheduleRefillReminder(task);
  } catch (error) {
    console.error("Error updating task reminders:", error);
  }
}
