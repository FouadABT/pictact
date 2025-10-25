# Reddit Devvit Compliance - Data Export Feature

## Overview
The PicTact data export functionality has been implemented with full Reddit Devvit platform compliance in mind. This document outlines the compliance measures and best practices implemented.

## Key Compliance Features

### 1. Reddit API Integration
- **Devvit Context Validation**: All export endpoints verify valid Devvit context (`context.postId`)
- **Reddit Authentication**: Uses `reddit.getCurrentUsername()` for user identification
- **Session Validation**: Cross-validates session tokens with current Reddit user
- **Subreddit Context**: Includes subreddit information in export metadata

### 2. Data Privacy & Protection
- **Reddit ID Redaction**: All Reddit user IDs and usernames are redacted from exports
- **App-Only Data**: Only exports PicTact app-specific data (game stats, achievements, preferences)
- **No Reddit User Data**: Does not export any Reddit personal information or account data
- **Explicit Consent**: Requires explicit user opt-in for personal data inclusion
- **Privacy Settings Respect**: Honors user privacy settings and export permissions

### 3. Security Measures
- **Authentication Required**: All endpoints require valid Reddit authentication
- **User Verification**: Ensures session user matches current Reddit user
- **Input Validation**: Validates all export parameters and options
- **Error Handling**: Proper error responses without exposing sensitive information

### 4. Audit & Compliance
- **Activity Logging**: Logs all export activities for audit purposes
- **Compliance Metadata**: Includes Reddit compliance flags in export data
- **Data Source Identification**: Clearly identifies data as "PicTact App" specific
- **Disclaimer**: Includes disclaimer about data scope and Reddit compliance

## API Endpoints

### POST /api/profile/export
**Reddit Devvit Compliant Data Export**

**Authentication**: 
- Requires valid Devvit context
- Uses Reddit's `getCurrentUsername()` API
- Optional session token validation

**Data Filtering**:
- Redacts Reddit user identifiers
- Only exports app-specific game data
- Respects user privacy settings
- Includes compliance metadata

**Response**:
```json
{
  "success": true,
  "data": {
    "exportedAt": "2024-10-19T...",
    "exportVersion": "1.0",
    "userData": {
      "profile": {
        "userId": "redacted",
        "redditUsername": "redacted",
        // ... app-specific data only
      }
    },
    "metadata": {
      "dataSource": "PicTact App",
      "redditCompliant": true,
      "disclaimer": "This export contains only PicTact app-specific data..."
    }
  },
  "redditUser": "current_username",
  "subreddit": "pictact_dev"
}
```

### GET /api/profile/export/estimate
**Export Size Estimation**

**Authentication**: Same Reddit Devvit requirements as export endpoint

**Purpose**: Allows users to estimate export size before generating

## Data Handling Policies

### What is Exported
✅ **App-Specific Data**:
- Game statistics (matches, wins, points)
- Achievement trophies and badges
- User preferences (game settings, accessibility)
- Subreddit-specific game activity

### What is NOT Exported
❌ **Reddit User Data**:
- Reddit user IDs or usernames
- Reddit account information
- Reddit personal data
- Email addresses or contact information
- Reddit API tokens or credentials

### Privacy Controls
- **User Consent**: Explicit opt-in required for any personal data
- **Privacy Settings**: Respects `allowDataExport` user preference
- **Data Minimization**: Only exports necessary app data
- **Redaction**: Automatically redacts Reddit identifiers

## Implementation Details

### File Structure
```
src/server/core/data-export-service-simple.ts  # Main export service
src/server/index.ts                            # API endpoints
src/shared/types/profile.ts                    # Type definitions
src/shared/types/api.ts                        # API types
```

### Key Classes
- **DataExportService**: Reddit-compliant export service
- **ProfileStorageService**: App data storage (not Reddit data)
- **AuthenticationService**: Reddit authentication integration

### Testing
- Comprehensive test suite covering all compliance scenarios
- Tests verify Reddit ID redaction
- Tests validate compliance metadata
- Tests ensure proper error handling

## Compliance Checklist

- ✅ Uses official Reddit Devvit APIs
- ✅ Validates Devvit context on all requests
- ✅ Integrates with Reddit authentication
- ✅ Only exports app-specific data
- ✅ Redacts Reddit user identifiers
- ✅ Respects user privacy settings
- ✅ Provides audit logging
- ✅ Includes compliance metadata
- ✅ Handles errors appropriately
- ✅ Follows Reddit data policies
- ✅ Comprehensive test coverage

## Future Considerations

1. **Data Retention**: Implement data retention policies per Reddit guidelines
2. **GDPR Compliance**: Extend for international data protection requirements
3. **Enhanced Logging**: Add more detailed audit trails if required
4. **Rate Limiting**: Implement export rate limiting to prevent abuse
5. **Encryption**: Consider encrypting exported data for additional security

## Contact & Support

For questions about Reddit Devvit compliance or data export functionality:
- Review Reddit Developer Platform documentation
- Check Devvit API guidelines
- Consult Reddit's data protection policies