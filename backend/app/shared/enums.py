from enum import Enum


class VehicleStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "OnTrip"
    IN_SHOP = "InShop"
    RETIRED = "Retired"


class DriverStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "OnTrip"
    OFF_DUTY = "OffDuty"
    SUSPENDED = "Suspended"


class TripStatus(str, Enum):
    DRAFT = "Draft"
    DISPATCHED = "Dispatched"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class MaintenanceType(str, Enum):
    OIL_CHANGE = "OilChange"
    TIRE = "Tire"
    REPAIR = "Repair"
    INSPECTION = "Inspection"
    OTHER = "Other"


class ExpenseCategory(str, Enum):
    TOLL = "Toll"
    PARKING = "Parking"
    FINE = "Fine"
    REPAIR = "Repair"
    OTHER = "Other"
