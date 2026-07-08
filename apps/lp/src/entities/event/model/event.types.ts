export interface EventAvailability {
  eventId: string;
  /** events.capacity。NULL は無制限 */
  capacity: number | null;
  reservedCount: number;
}
