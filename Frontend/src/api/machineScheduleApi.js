import apiClient from "./authApi";

export const getMachineSchedule = async (machineId, from, to) => {
  return apiClient.get(`/machine-schedule`, {
    params: { machineId, from, to }
  });
};

export const getNextFreeSlot = async (machineId) => {
  return apiClient.get(`/machine-schedule/next-slot/${machineId}`);
};

export const getMachineQueue = async (machineId) => {
  return apiClient.get(`/machine-schedule/queue`, {
    params: { machineId }
  });
};

export const reorderMachineQueueItem = async (machineId, workOrderItemId, direction) => {
  return apiClient.put(`/machine-schedule/reorder`, {
    machineId,
    workOrderItemId,
    direction
  });
};

export const moveWorkOrderItemToPosition = async (machineId, workOrderItemId, newPosition) => {
  return apiClient.put(`/machine-schedule/reorder-to`, {
    machineId,
    workOrderItemId,
    newPosition
  });
};

export const toggleWorkOrderHold = async (workOrderItemId, hold) => {
  return apiClient.put(`/machine-schedule/hold`, {
    workOrderItemId,
    hold
  });
};
