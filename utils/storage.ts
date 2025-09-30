import AsyncStorage from "@react-native-async-storage/async-storage";

const TASKS_KEY = "@tasks";
const TASK_HISTORY_KEY = "@task_history";

export interface Task {
  id: string;
  name: string;
  description: string;
  times: string[];
  startDate: string;
  duration: string;
  color: string;
  reminderEnabled: boolean;
  currentSupply: number;
  totalSupply: number;
  refillAt: number;
  refillReminder: boolean;
  lastRefillDate?: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  timestamp: string;
  done: boolean;
}

export async function getTasks(): Promise<Task[]> {
  try {
    const data = await AsyncStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

export async function addTask(task: Task): Promise<void> {
  try {
    const tasks = await getTasks();
    tasks.push(task);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
}

export async function updateTask(
  updatedTask: Task
): Promise<void> {
  try {
    const tasks = await getTasks();
    const index = tasks.findIndex(
      (task) => task.id === updatedTask.id
    );
    if (index !== -1) {
      tasks[index] = updatedTask;
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    const tasks = await getTasks();
    const updatedTasks = tasks.filter((task) => task.id !== id);
    await AsyncStorage.setItem(
      TASKS_KEY,
      JSON.stringify(updatedTasks)
    );
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}

export async function getTaskHistory(): Promise<TaskHistory[]> {
  try {
    const data = await AsyncStorage.getItem(TASK_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting task history:", error);
    return [];
  }
}

export async function getTodaysTasks(): Promise<TaskHistory[]> {
  try {
    const history = await getTaskHistory();
    const today = new Date().toDateString();
    return history.filter(
      (record) => new Date(record.timestamp).toDateString() === today
    );
  } catch (error) {
    console.error("Error getting today's tasks:", error);
    return [];
  }
}

export async function recordTask(
  taskId: string,
  done: boolean,
  timestamp: string
): Promise<void> {
  try {
    const history = await getTaskHistory();
    const newRecord: TaskHistory = {
      id: Math.random().toString(36).substr(2, 9),
      taskId,
      timestamp,
      done,
    };

    history.push(newRecord);
    await AsyncStorage.setItem(TASK_HISTORY_KEY, JSON.stringify(history));

    // Update task supply if done
    if (done) {
      const tasks = await getTasks();
      const task = tasks.find((task) => task.id === taskId);
      if (task && task.currentSupply > 0) {
        task.currentSupply -= 1;
        await updateTask(task);
      }
    }
  } catch (error) {
    console.error("Error recording task:", error);
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([TASKS_KEY, TASK_HISTORY_KEY]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}
