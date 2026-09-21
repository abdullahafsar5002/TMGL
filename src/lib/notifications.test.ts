import { describe, it, expect } from 'vitest';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
} from './notifications';

describe('Notifications Service', () => {
  describe('getNotifications', () => {
    it('exists and accepts a profileId string', () => {
      expect(typeof getNotifications).toBe('function');
      expect(getNotifications.length).toBe(1);
    });

    it('returns a Promise', () => {
      const result = getNotifications('test-id');
      expect(result).toBeInstanceOf(Promise);
    });

    it('returns ServiceResult shape', async () => {
      const result = await getNotifications('nonexistent-id');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      expect(result.data === null || Array.isArray(result.data)).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('exists and accepts a profileId string', () => {
      expect(typeof getUnreadCount).toBe('function');
      expect(getUnreadCount.length).toBe(1);
    });

    it('returns a Promise', () => {
      const result = getUnreadCount('test-id');
      expect(result).toBeInstanceOf(Promise);
    });

    it('returns ServiceResult shape with number', async () => {
      const result = await getUnreadCount('nonexistent-id');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      expect(result.data === null || typeof result.data === 'number').toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('exists and accepts an id string', () => {
      expect(typeof markAsRead).toBe('function');
      expect(markAsRead.length).toBe(1);
    });

    it('returns a Promise', () => {
      const result = markAsRead('test-id');
      expect(result).toBeInstanceOf(Promise);
    });

    it('returns ServiceResult shape', async () => {
      const result = await markAsRead('nonexistent-id');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });
  });

  describe('markAllAsRead', () => {
    it('exists and accepts a profileId string', () => {
      expect(typeof markAllAsRead).toBe('function');
      expect(markAllAsRead.length).toBe(1);
    });

    it('returns a Promise', () => {
      const result = markAllAsRead('test-id');
      expect(result).toBeInstanceOf(Promise);
    });

    it('returns ServiceResult shape', async () => {
      const result = await markAllAsRead('nonexistent-id');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });
  });

  describe('createNotification', () => {
    it('exists and accepts a notification object', () => {
      expect(typeof createNotification).toBe('function');
    });

    it('returns a Promise', () => {
      const result = createNotification({
        recipient_id: 'test',
        type: 'test',
        title: 'Test',
        message: 'Test message',
      });
      expect(result).toBeInstanceOf(Promise);
    });

    it('returns ServiceResult shape', async () => {
      const result = await createNotification({
        recipient_id: 'nonexistent',
        type: 'test',
        title: 'Test',
        message: 'Test',
      });
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
    });
  });
});
