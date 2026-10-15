class Reminder {
  final int? id;
  final String title;
  final String notes;
  final DateTime scheduledTime;
  final bool isCompleted;
  final bool isDelivered;

  Reminder({
    this.id,
    required this.title,
    this.notes = '',
    required this.scheduledTime,
    this.isCompleted = false,
    this.isDelivered = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'notes': notes,
      'scheduled_time': scheduledTime.toIso8601String(),
      'is_completed': isCompleted ? 1 : 0,
      'is_delivered': isDelivered ? 1 : 0,
    };
  }

  factory Reminder.fromMap(Map<String, dynamic> map) {
    return Reminder(
      id: map['id'] as int?,
      title: map['title'] as String,
      notes: (map['notes'] as String?) ?? '',
      scheduledTime: DateTime.parse(map['scheduled_time'] as String),
      isCompleted: (map['is_completed'] as int) == 1,
      isDelivered: (map['is_delivered'] as int) == 1,
    );
  }
}
