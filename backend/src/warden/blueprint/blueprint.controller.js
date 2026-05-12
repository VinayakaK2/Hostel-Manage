import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./blueprint.service.js";

export const overview = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const data = await service.getBlueprintOverview(hostelId);
  res.json({ success: true, message: "OK", data });
});

export const floor = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const floor = Number.parseInt(String(req.params.floor), 10);
  if (Number.isNaN(floor)) {
    res.status(400).json({ success: false, message: "Invalid floor" });
    return;
  }
  const data = await service.getBlueprintFloor(hostelId, floor);
  res.json({ success: true, message: "OK", data });
});

export const roomDetail = asyncHandler(async (req, res) => {
  const { hostelId } = req.warden;
  const data = await service.getRoomBlueprintDetail(req.params.id, hostelId);
  res.json({ success: true, message: "OK", data });
});
