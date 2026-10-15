class NotificationItem {
  final String id;
  final String packageName;
  final String title;
  final String text;
  final DateTime timestamp;

  NotificationItem({
    required this.id,
    required this.packageName,
    required this.title,
    required this.text,
    required this.timestamp,
  });

  String get appDisplayName {
    if (packageName.contains('whatsapp')) return 'WhatsApp';
    if (packageName.contains('messaging') || packageName.contains('sms')) return 'SMS';
    if (packageName.contains('dialer') || packageName.contains('telecom')) return 'Phone';
    if (packageName.contains('gm') || packageName.contains('gmail')) return 'Gmail';
    if (packageName.contains('slack')) return 'Slack';
    return packageName.split('.').last;
  }
}
