import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import Swal from 'sweetalert2';

import { fetchParcelById, cancelParcelOrder, selectSelectedParcel, resetSelectedParcel } from '../features/parcels/parcelsSlice';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import UpdateDestinationModal from '../features/parcels/UpdateDestinationModal';
// Corrected and consolidated icon imports
import { 
  FaArrowLeft, FaEdit, FaTimesCircle, FaPhone, FaUser, 
  FaDollarSign, FaWeightHanging, FaShieldAlt, FaCheckCircle 
} from 'react-icons/fa';

// Fix for default Leaflet marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ParcelDetailsPage = () => {
  const { parcelId } = useParams();
  const dispatch = useDispatch();
  const { details: parcel, status, error } = useSelector(selectSelectedParcel);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    dispatch(fetchParcelById(parcelId));
    return () => {
      dispatch(resetSelectedParcel());
    };
  }, [parcelId, dispatch]);

  const handleCancelOrder = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, cancel it!'
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(cancelParcelOrder(parcelId)).unwrap()
          .then(res => Swal.fire('Cancelled!', res.message, 'success'))
          .catch(err => Swal.fire('Error!', err.message, 'error'));
      }
    });
  };
  
  if (status === 'loading' || status === 'idle') {
    return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  }

  if (status === 'failed' || !parcel) {
    return <div className="text-center p-10 text-error">Error: {error || 'Could not load parcel details.'}</div>;
  }
  
  const { pickup_coordinates, destination_coordinates } = parcel.routeDetails || {};
  const positionPickup = pickup_coordinates ? [pickup_coordinates.lat, pickup_coordinates.lon] : null;
  const positionDestination = destination_coordinates ? [destination_coordinates.lat, destination_coordinates.lon] : null;
  const polyline = positionPickup && positionDestination ? [positionPickup, positionDestination] : [];

  const isActionable = parcel.status !== 'Delivered' && parcel.status !== 'Cancelled';

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Link to="/dashboard" className="inline-flex items-center text-primary mb-6 hover:underline">
          <FaArrowLeft className="mr-2"/> Back to Dashboard
        </Link>
        
        {/* --- PROOF OF DELIVERY BANNER --- */}
        {parcel.status === 'Delivered' && parcel.proof_of_delivery_image_url && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow-md mb-6" role="alert">
            <div className="flex">
              <div className="py-1"><FaCheckCircle className="h-6 w-6 mr-4"/></div>
              <div>
                <p className="font-bold">Delivery Confirmed</p>
                <p className="text-sm">Proof of delivery has been uploaded for this order.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
            <h1 className="text-2xl font-bold text-secondary mb-2">Order #{parcel.id}</h1>
            <p className="text-lg mb-4">Status: <span className="font-semibold text-primary">{parcel.status}</span></p>
            
            {parcel.parcel_image_url && (
              <img src={`${apiBaseUrl}${parcel.parcel_image_url}`} alt={`Parcel ${parcel.id}`} className="rounded-lg mb-4 w-full h-auto object-cover shadow-inner" />
            )}

            {/* --- PROOF OF DELIVERY IMAGE --- */}
            {parcel.proof_of_delivery_image_url && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold text-secondary mb-2">Proof of Delivery</h3>
                <img src={`${apiBaseUrl}${parcel.proof_of_delivery_image_url}`} alt={`Proof for parcel ${parcel.id}`} className="rounded-lg w-full h-auto object-cover shadow-inner" />
              </div>
            )}

            <div className="space-y-4 text-gray-700 mt-4">
              <div className="border-t pt-4">
                <p className="flex items-center"><FaUser className="mr-3 text-primary"/><strong>Recipient:</strong><span className="ml-auto font-medium">{parcel.recipient_name}</span></p>
                <p className="flex items-center"><FaPhone className="mr-3 text-primary"/><strong>Recipient Phone:</strong><span className="ml-auto font-medium">{parcel.recipient_phone || 'N/A'}</span></p>
                <p className="flex items-center"><FaPhone className="mr-3 text-primary"/><strong>Sender Phone:</strong><span className="ml-auto font-medium">{parcel.sender_phone || 'N/A'}</span></p>
              </div>
              <div className="border-t pt-4">
                <p><strong>From:</strong> {parcel.pickup_location}</p>
                <p><strong>To:</strong> {parcel.destination}</p>
                {parcel.present_location && <p><strong>Current Location:</strong> {parcel.present_location}</p>}
              </div>
              <div className="border-t pt-4">
                 <p className="flex items-center"><FaWeightHanging className="mr-3 text-primary"/><strong>Weight:</strong><span className="ml-auto font-medium">{parcel.weight} kg</span></p>
                 <p className="flex items-center"><FaShieldAlt className="mr-3 text-primary"/><strong>Insured Value:</strong><span className="ml-auto font-medium">${parcel.estimated_cost ? parcel.estimated_cost.toFixed(2) : 'N/A'}</span></p>
                 <p className="flex items-center"><FaDollarSign className="mr-3 text-primary"/><strong>Shipping Cost:</strong><span className="ml-auto font-medium">${parcel.shipping_cost ? parcel.shipping_cost.toFixed(2) : 'N/A'}</span></p>
                 {parcel.routeDetails && <p><strong>Distance:</strong> {parcel.routeDetails.distance_km} km</p>}
              </div>
            </div>

            {isActionable && (
              <div className="mt-8 flex flex-col space-y-4 sm:space-x-0 sm:flex-row sm:space-y-0 sm:space-x-4">
                <Button onClick={() => setIsModalOpen(true)}><FaEdit className="mr-2"/>Change Destination</Button>
                <Button onClick={handleCancelOrder}><FaTimesCircle className="mr-2"/>Cancel Order</Button>
              </div>
            )}
          </div>

          {/* Right Column: Map */}
          {positionPickup && (
            <div className="lg:col-span-2 h-80 lg:h-[600px] rounded-lg shadow-md overflow-hidden">
              <MapContainer center={positionPickup} zoom={10} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={positionPickup}></Marker>
                {positionDestination && <Marker position={positionDestination}></Marker>}
                {polyline.length > 0 && <Polyline pathOptions={{ color: 'blue' }} positions={polyline} />}
              </MapContainer>
            </div>
          )}
        </div>
      </div>
      {parcel && <UpdateDestinationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} parcel={parcel} />}
    </>
  );
};

export default ParcelDetailsPage;