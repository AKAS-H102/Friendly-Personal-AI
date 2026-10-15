import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/reminder.dart';

class ReminderService {
  static final ReminderService instance = ReminderService._internal();
  ReminderService._internal();

  Database? _db;
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);
    await _notifications.initialize(initSettings);

    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'machi_reminders.db');

    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            notes TEXT,
            scheduled_time TEXT NOT NULL,
            is_completed INTEGER DEFAULT 0,
            is_delivered INTEGER DEFAULT 0
          )
        ''');
      },
    );
  }

  Future<int> addReminder(String title, DateTime time, {String notes = ''}) async {
    final reminder = Reminder(
      title: title,
      notes: notes,
      scheduledTime: time,
    );

    final id = await _db!.insert('reminders', reminder.toMap());

    // Schedule notification independently of assistant ON/OFF state
    await _notifications.show(
      id,
      'Machi Reminder: $title',
      notes.isEmpty ? 'Your scheduled reminder' : notes,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'machi_reminders_channel',
          'Machi Reminders',
          channelDescription: 'Notifications for smart reminders',
          importance: Importance.max,
          priority: Priority.high,
          playSound: true,
        ),
      ),
    );

    return id;
  }

  Future<List<Reminder>> getPendingReminders() async {
    if (_db == null) return [];
    final maps = await _db!.query(
      'reminders',
      where: 'is_completed = ?',
      whereArgs: [0],
      orderBy: 'scheduled_time ASC',
    );
    return maps.map((m) => Reminder.fromMap(m)).toList();
  }

  Future<void> markCompleted(int id) async {
    await _db!.update('reminders', {'is_completed': 1}, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> deleteReminder(int id) async {
    await _db!.delete('reminders', where: 'id = ?', whereArgs: [id]);
  }
}
